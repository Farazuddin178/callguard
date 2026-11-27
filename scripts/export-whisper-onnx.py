"""Export a local multilingual Whisper checkpoint to the Transformers.js q8 layout."""

import argparse
import json
from pathlib import Path
import re
from shutil import copyfile

import onnx
from onnx import AttributeProto, TensorProto, helper
from onnxruntime.quantization import QuantType, quantize_dynamic
from optimum.exporters.onnx import main_export
from optimum.onnx.graph_transformations import merge_decoders
import torch
from transformers import WhisperFeatureExtractor, WhisperTokenizerFast


def make_cache_positions_internal(model):
    # Transformers.js 3 passes the key/value cache and token IDs, but not cache_position.
    graph = model.graph
    if not any(value.name == "cache_position" for value in graph.input):
        return
    branch = next(node for node in graph.node if node.op_type == "If")
    past = next(attr.g for attr in branch.attribute if attr.name == "then_branch" and attr.type == AttributeProto.GRAPH)
    past.initializer.extend([
        helper.make_tensor("cg_cache_axis", TensorProto.INT64, [], [2]),
        helper.make_tensor("cg_tokens_axis", TensorProto.INT64, [], [1]),
    ])
    nodes = [
        helper.make_node("Shape", ["past_key_values.0.decoder.key"], ["cg_cache_shape"]),
        helper.make_node("Gather", ["cg_cache_shape", "cg_cache_axis"], ["cg_cache_start"], axis=0),
        helper.make_node("Shape", ["input_ids"], ["cg_tokens_shape"]),
        helper.make_node("Gather", ["cg_tokens_shape", "cg_tokens_axis"], ["cg_tokens_length"], axis=0),
        helper.make_node("Add", ["cg_cache_start", "cg_tokens_length"], ["cg_cache_end"]),
        helper.make_node("Range", ["cg_cache_start", "cg_cache_end", "cg_tokens_axis"], ["cache_position"]),
    ]
    for node in reversed(nodes):
        past.node.insert(0, node)
    for index, value in enumerate(graph.input):
        if value.name == "cache_position":
            del graph.input[index]
            break


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--reuse-fp32", action="store_true", help="Resume from the sibling -fp32 export.")
    args = parser.parse_args()
    checkpoint, output = args.checkpoint.resolve(), args.output.resolve()
    repo = Path(__file__).resolve().parents[1]
    if output.is_relative_to(repo):
        parser.error("Choose an output directory outside the repository.")
    if not checkpoint.is_dir():
        parser.error("Provide the directory of a locally downloaded checkpoint.")

    torch.set_num_threads(2)
    scratch = output.with_name(output.name + "-fp32")
    if not args.reuse_fp32:
        main_export(
            str(checkpoint),
            scratch,
            task="automatic-speech-recognition-with-past",
            device="cpu",
            opset=17,
            local_files_only=True,
            do_validation=False,
            no_post_process=True,
        )

    models = output / "onnx"
    models.mkdir(parents=True, exist_ok=True)
    quantized = {}
    for name in ("encoder_model", "decoder_model", "decoder_with_past_model"):
        directory = models if name == "encoder_model" else scratch
        quantized[name] = directory / f"{name}_quantized.onnx"
        quantize_dynamic(
            scratch / f"{name}.onnx",
            quantized[name],
            weight_type=QuantType.QInt8,
            op_types_to_quantize=["MatMul", "Gemm", "Gather"],
        )
    decoder = merge_decoders(
        quantized["decoder_model"],
        quantized["decoder_with_past_model"],
        strict=False,
    )
    make_cache_positions_internal(decoder)
    onnx.checker.check_model(decoder)
    onnx.save_model(decoder, models / "decoder_model_merged_quantized.onnx")

    copyfile(scratch / "config.json", output / "config.json")
    tokenizer = WhisperTokenizerFast.from_pretrained(checkpoint, local_files_only=True, from_slow=True)
    tokenizer.save_pretrained(output)
    WhisperFeatureExtractor.from_pretrained(checkpoint, local_files_only=True).save_pretrained(output)

    # This checkpoint predates multilingual generation metadata used by Transformers.js.
    tokens = tokenizer.get_vocab()
    generation_file = checkpoint / "generation_config.json"
    generation = json.loads(generation_file.read_text(encoding="utf-8")) if generation_file.exists() else {}
    generation.update(
        is_multilingual=True,
        use_cache=True,
        lang_to_id={token: index for token, index in tokens.items() if re.fullmatch(r"<\|[a-z]{2,3}\|>", token)},
        task_to_id={task: tokens[f"<|{task}|>"] for task in ("transcribe", "translate")},
        no_timestamps_token_id=tokens["<|notimestamps|>"],
        forced_decoder_ids=None,
    )
    (output / "generation_config.json").write_text(json.dumps(generation, indent=2) + "\n", encoding="utf-8")
    for file in sorted(models.iterdir()):
        print(f"{file.name}: {file.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()


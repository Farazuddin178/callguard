# Voice clip evaluation

Each score uses q8 inference on CPU, 16 kHz mono audio in the same 12-second chunks as the browser, and the shared CallGuard scorer. A **Careful** result counts as a miss for either expected label. A caught scam means a **Scam likely** verdict, at a score of 70 or higher.

The original set contains four clips per language. English uses eSpeak NG, and Hindi and Telugu use Meta MMS-TTS. The replacement run keeps the eight Hindi and Telugu scripts and synthesizes them with Indic Tiny TTS, alternating male and female voices. The unchanged English four were measured in the original-set runs. Voice and licence details are in the [sample manifest](../../public/samples/manifest.json) and [third-party notices](../../THIRD_PARTY_NOTICES.md).

## Results by configuration

Each language cell shows **correct verdicts · scams caught**, with the number of cases in each denominator.

| Model | Synthetic voices | Script filter | Indic matching | English | Hindi | Telugu | Overall |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Base | Original | Off | Before | 4/4 · 2/2 | 2/4 · 0/2 | 2/4 · 0/2 | 8/12 · 2/6 |
| Base | Original | On | Before | 4/4 · 2/2 | 2/4 · 0/2 | 2/4 · 0/2 | 8/12 · 2/6 |
| Small | Original | Off | Before | 4/4 · 2/2 | 2/4 · 0/2 | 2/4 · 0/2 | 8/12 · 2/6 |
| Small | Original | On | Before | 4/4 · 2/2 | 2/4 · 0/2 | 2/4 · 0/2 | 8/12 · 2/6 |
| Base | Original | On | Updated | 4/4 · 2/2 | 2/4 · 0/2 | 2/4 · 0/2 | 8/12 · 2/6 |
| Small | Original | On | Updated | 4/4 · 2/2 | 4/4 · 2/2 | 2/4 · 0/2 | 10/12 · 4/6 |
| Base | Indic Tiny TTS | On | Updated | — | 2/4 · 0/2 | 2/4 · 0/2 | 4/8 · 0/4 |
| Small | Indic Tiny TTS | On | Updated | — | 3/4 · 1/2 | 2/4 · 0/2 | 5/8 · 1/4 |
| Telugu Base fine-tune | Original MMS-TTS | On | Updated | — | — | 3/4 · 1/2 | 3/4 · 1/2 |
| Telugu Base fine-tune | Indic Tiny TTS | On | Updated | — | — | 3/4 · 1/2 | 3/4 · 1/2 |

## Bundled voices and app defaults

The shipped Hindi set keeps the MMS-TTS SIM sample and uses Indic Tiny TTS for the other three. With Small, the original SIM clip scored 81 and the replacement scored 36. The Indic Tiny TTS parcel clip scored 86. Its two genuine clips stayed below 30 and produced more readable Devanagari than their original versions. The four Telugu replacements also gave the fine-tune more readable transcripts. Both Telugu voice sets tied on verdict accuracy. The final selection uses the two-speaker Indic Tiny TTS versions.

| Shipped clips and default model | Correct verdicts | Scams caught |
| --- | ---: | ---: |
| English · Base · eSpeak NG | 4/4 | 2/2 |
| Hindi · Small · one MMS-TTS and three Indic Tiny TTS clips | 4/4 | 2/2 |
| Telugu · Small · Indic Tiny TTS | 2/4 | 0/2 |
| Total | 10/12 | 4/6 |

This table selects the shipped clip results from the measured runs below. Selecting Hindi or Telugu uses Small and shows the approximate 250 MB model download. English and automatic language detection use Base. Live guarding defaults to Base. The Telugu check displays a beta notice. The optional Telugu fine-tune caught the OTP request in both voice sets and missed the prize fee in both. The fee cue was incomplete in the decoded text. [Model export and hosting instructions](../telugu-whisper.md).

The Windows sandbox blocked Node from launching FFmpeg. PowerShell decoded the synthetic clips with FFmpeg to the same 16 kHz mono format, and the evaluation then ran the same Transformers.js and scoring code. Timings include synthetic inference only and some runs shared the CPU. The owner folder contained zero eligible audio files. These twelve synthetic clips measure the examples shown here. Accuracy on real calls remains unmeasured.

## Base with updated matching and original voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| en | 4/4 | 4/4 | 2/2 | — | 31.5 |
| hi | 4/4 | 2/4 | 0/2 | 0/4 | 59.4 |
| te | 4/4 | 2/4 | 0/2 | 0/4 | 55.8 |
| Overall | 12/12 | 8/12 | 2/6 | 0/8 | 48.9 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello, I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I? Do not hang up thi | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello, we are checking a payment on your account. I just sent a message to the phone you are holding. I can't even message. What shall I do now? Help me your OTP. Read the verifica | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new passport cutout lunch last week. The passport is ready for you to pick up. Can I come after I take my lunch on? of course. The branch ope | 8 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. What you mind leaving the mark set the front  | 8 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | Namaste, your mobile is in the business of the company, today your SIM will be closed, it is still about that, my phone is still running காமே דுகான் பராக புற்ற சற்றிஷயா பன் புறக்கி | 10 | Looks genuine | No | No |
| hi-parcel.mp3 | hi | scam | νமस்டை, அவ்வளுக்கு, நாம் காபாச் சல், அமரு, கூடாம், மேருக்காக, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவள Aap  | 9 | Looks genuine | No | No |
| hi-family.mp3 | hi | genuine | அம்மா, I will come a little late, Bazar's side, Ulysses has closed the church, just going from the other street. What is it? I will feed the baby, துமானே, துமானே, துமானே, துமானே, த | 7 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | Father, the man on the table was called to see Raviwar with us. | 8 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | �έ�viya We have not seen this beauty in the world, how did you get this beauty? In the past few years, your name is also mentioned in the world, we have started a physical challeng | 13 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | νамашカルム cases your name is a girl, your name is a girl, your phone is a girl, now you are a person, a person is a person, I am a scientist ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, | 11 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | �έ�viya � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork | 9 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | Namaskaram Gatham, Varam, Miru, Bhavamku, Sakhalo and Dharakaasur Siddham, your son is in the hospital. I am a person who is a doctor.  | 10 | Looks genuine | Yes | No |

## Small with updated matching and original voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| en | 4/4 | 4/4 | 2/2 | — | 82.0 |
| hi | 4/4 | 4/4 | 2/2 | 0/4 | 85.5 |
| te | 4/4 | 2/4 | 0/2 | 0/4 | 41.7 |
| Overall | 12/12 | 10/12 | 4/6 | 0/8 | 69.7 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello. I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I... Call my daughter | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello. We are checking a payment on your account. I just sent a message to the phone you are folding. I can't see the message. What should I do now? Tell me your OTP. Read the veri | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new Passbook at our branch last week. The Passbook is ready for you to pick up. Can I come after I take my Bronson? to school tomorrow? Of co | 7 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. Would you mind leaving me alone? the box at t | 7 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | नमस्ते आपके मुबाल खाते की जानकारी में गर्वडी है आज आपका सिम् बन्द कर दिया जाएगा ये कोल उसी के बारे में है मेरा फोंको अबही थी चल रहा है अब ही हमारा लिए खोली तुरग सत्यापन पूरग कीजीे  | 81 | Scam likely | Yes | No |
| hi-parcel.mp3 | hi | scam | नमस्ते आपके नाम का पासल हमारे गुदाम में रोका रहे है, उस में दर्स बरामद हुए है. मैंने तो कोई पासल बहिजा ही नहीं आपकी सपते की बात कर है. आपके नांग पर मामला दर्दिया है, मैं अबही अपने  | 85 | Scam likely | Yes | No |
| hi-family.mp3 | hi | genuine | आमा, मैं थोडी देर से आँँगी बाजार की तरव, उलिस ने सरक बंद की है, बस दुसरी गली से जा रही है. टीक है. बेकी मैं खाना गरम कर देखा. मेरी सहली यही बटी है, कर पूँचने से पहले मैं दूद भी ले  | 9 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | पिता जी मेश पर भीज्ली कबिलका है आपने कहता की रवीवार को हम उसे साथ देख कर बहर देंगे है रवीवार को खीख हैगा तुमारी माने पिच्डी रसीड भी उसे प्रटेगा रवी� मिल गेई मैं दोनो कागस रप दिती ह | 8 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | � now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now | 10 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | � now, I sent a message to your phone. �コ� att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att a | 10 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | � now ្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្� | 10 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | � now , నిరిల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల �コ� att | 10 | Looks genuine | Yes | No |

## Base with updated matching and replacement voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| hi | 4/4 | 2/4 | 0/2 | 0/4 | 36.4 |
| te | 4/4 | 2/4 | 0/2 | 0/4 | 32.0 |
| Overall | 8/8 | 4/8 | 0/4 | 0/8 | 34.2 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| hi-sim.mp3 | hi | scam | Namaste, your mobile is very hot in your life, your SIM will be closed today. Who is this about him? My phone is still working well. அவளுங்கள் அவளுங்கள் அவளுங்கள் அவளுங்கள் அவளுங்க | 12 | Looks genuine | No | No |
| hi-parcel.mp3 | hi | scam | Namaste, your name is Rukha in our village, there is a drugstress in it. I have not sent any parcel, what are you talking about? तो लिवाँ वाँ वाँ वाँ वाँ वाँ वाँ वाँ वाँ वाँ वाँ वा | 9 | Looks genuine | No | No |
| hi-family.mp3 | hi | genuine | அம்மா, I will come from a little late, Bazar's police has closed the road, just going from the other lane. Okay, dear, I will go and get some food. தும்பாரி சாத்து கோன்று? - மிக்கு | 9 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | Father, we have a daughter on the table. You told us that we will see her with Raviwar. Yes, Raviwar will be fine. Your mother has sent you. तो लिवादे विवादे में तो लिवादे विवादे व | 10 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | fff We will teach you a lesson in the future. | 12 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | Noscaram, your bank account has gone to a small town. I had a happy birthday with your phone. Tell me your vote. Tell me your name and your name. Tell me your name and your name. I | 12 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | 'Naskaram' - 'Ni ru order chaisana pustakal pethetheth' - 'Yanu, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni ru, ni  | 9 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | Greetings! We are here to meet you at the bank of the bank. Your daughter's passport is now in the counter. I am going to pass the passport now. fff | 11 | Looks genuine | Yes | No |

## Small with updated matching and replacement voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| hi | 4/4 | 3/4 | 1/2 | 0/4 | 99.2 |
| te | 4/4 | 2/4 | 0/2 | 0/4 | 47.2 |
| Overall | 8/8 | 5/8 | 1/4 | 0/8 | 73.2 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| hi-sim.mp3 | hi | scam | नास्ते आपके मोबाल खाते की जानकारी में गड़बडी है आपका सिम्ब बन्द कर दियागा ये कोर उसी के बारे में है अपके रफा पर प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा अब ही हमारा लिंक खोलीए तुरन्द सक | 36 | Be careful | No | No |
| hi-parcel.mp3 | hi | scam | नास्ते आपके नामका पार्सल हमारे गोदाम में रोका गया है उस में द्रक्स बरामद हुए है बार्सल गेजाही नहीं आपके सपते की बाद कर रही है अपकी नाम पर मामला दरज कर दिया है, मैं अभी अबही अपने अद | 86 | Scam likely | Yes | No |
| hi-family.mp3 | hi | genuine | अम्मा, मैं थोडी देर से आँँगी. बाजार की तरफ पुलिस ने सड़क बन्द की है. बस दुसरी गली से जारही है. तीक है देदी. मैं खाना गरम कर देती हूँ. तुम्हारे साथ कुन है? मेरे सहली यही बैटी है गर  | 8 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | पिताजी मेज पर भिजली का बिलरखा है आप आप ने कहा था की रवीवार को हम उसे साथ दिखकर बर देंगे. आप रवीवार को थीक रहेगा तुम्हारी माने पिच्छाए. मिर गेई, मैं दोनो कागज रक देती हूँ इस बार की  | 7 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | � now �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ� atta, �コ�  | 9 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | � now �コ� att | 10 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | � now �コ� att | 10 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | � now �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 �コ�持 | 10 | Looks genuine | Yes | No |

## Fine-tuned Telugu Base with original voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| te | 4/4 | 3/4 | 1/2 | 0/4 | 30.6 |
| Overall | 4/4 | 3/4 | 1/2 | 0/4 | 30.6 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| te-prize.mp3 | te | scam | నమస్కారం మా దుకాణం వార్షిక ఉత్సవంలో మీకు బహుమతి వచ్చింది మీ పేరు మా జాబితాలో ఉంది నా� లేదు ఈ బహుమతి ఎలా వచ్చింది దుకాణంలో కొన్న వారి కార్లలో మీ పేమించుకున్నాం బహుమతి తీసు ఆ తర్వాత  | 9 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | నమస్కారం మీ వియాన్ కు ఖాతాలో ఒక చెల్లింపు ఆగింది మీ ఫోన్ కి ఇప్పుడే ఒక సందేశం పంపించా మమ్యం కు శాఖకు వెళ్లి అడగనా మీ ఓటీపీ నాకు చెప్పండి తనిఖీ పూర్తవ్వాలంటే ఆ కోడ్ నాకు చద ఏమి లేదు | 100 | Scam likely | Yes | No |
| te-courier.mp3 | te | genuine | నమస్కారం వీరు ఆర్డర్ చేసిన పుస్తకాలు పెట్టేయాను నేను మీ భవనం గేకు దగ్గర ఉన్నాను నేను వచ్చి పక్కన పెట్టగలరా సరే కాపలాదారు దగ్గర పెట్టాను మీరు కిందకు వచ్చాక తీసుకోండి ప� | 8 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | నమస్కారం గత వారం మీరు బ్యాంకు శాఖలో ఇచ్చిన దరఖాస్తు సిద్ధమైంది మీ కొత్త పాస్పోక్ మా � మధ్యాహ్నం వచ్చి తీసుకుంటే సరిపోతుందా సరిపోతుంది మా కౌంటర్ సాయంత్రం నాలుగు వరకు తెరి తెచ్చుకోండ | 8 | Looks genuine | Yes | No |

## Fine-tuned Telugu Base with replacement voices

| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |
| --- | ---: | ---: | ---: | ---: | ---: |
| te | 4/4 | 3/4 | 1/2 | 0/4 | 27.5 |
| Overall | 4/4 | 3/4 | 1/2 | 0/4 | 27.5 |

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| te-prize.mp3 | te | scam | నా స్కారం మా దుకాణం వార్షిక ఉత్సవంలో మీకు బహుమతి వచ్చింది మీ పేరు మా జాబితాలో ఉంది నా దుకాణంలో కొన్నవారి పేర్లలో మీ పేరు ఎంచుకున్నాం బహుమతి తీసుకోవాలంటే ముంద | 11 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | నా స్కారం మీ బ్యాంకు ఖాతాలో ఒక చెల్లింపు ఆగింది మీ ఫోన్ కి ఇప్పుడే ఒక సందేశం పంపించాన నీ ఓటీపీ నాకు చెప్పండి తనిఖీ పూర్తవాలంటే ఆ కోర్టు నాకు చదివి చె� | 100 | Scam likely | Yes | No |
| te-courier.mp3 | te | genuine | నా స్కారం మీరు ఆర్డర్ చేసిన పుస్తకాలు పెట్టారు తెచ్చాను నేను మీ భావనం గేటు దగ్గర ఉన్� పక్కన పెట్టేలా సరే కాపలా దగ్గర పెట్టాను మీరు కిందకు వచ్చాక తీసుక� | 8 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | నా స్కారం గత వారం మీరు బ్యాంకు శాఖలో ఇచ్చిన దరఖాస్తు సిద్ధమైంది మీ కొత్త పాస్ బుక్ మా సరిపోతుందా సరిపోతుంది మా కౌంటర్ సాయంత్రం నాలుగు వరకు తెరిచి ఉంటు | 8 | Looks genuine | Yes | No |

## Previous scoring and script filter comparison

### Script verification

The Hindi filter blocks Arabic-script ranges. The Telugu filter blocks those ranges plus Tamil, Devanagari and Kannada. This check uses the complete decoded words for the new runs and the published excerpts for the earlier Base baseline.

| Model | Script filter | Hindi clips with blocked characters | Telugu clips with blocked characters |
| --- | --- | ---: | ---: |
| Base | Before | 4/4 | 4/4 |
| Base | After | 0/4 | 0/4 |
| Small | Before | 1/4 | 4/4 |
| Small | After | 0/4 | 0/4 |

### Base · Before

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Blocked characters |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello, I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I? Do not hang up thi | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello, we are checking a payment on your account. I just sent a message to the phone you are holding. I can't even message. What shall I do now? Help me your OTP. Read the verifica | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new passport cutout lunch last week. The passport is ready for you to pick up. Can I come after I take my lunch on? of course. The branch ope | 8 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. What you mind leaving the mark set the front | 8 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | نمس تے آپ کے موبائل خاتي کی جنقاری میں گربڑی ہے آج آپ کا سم بند کر دیا جائے گا یہ اور اسی کے بارے میں ہے میرا فون کو ابھی تھی چل رہا ہے کیا میں دکان پر آپ کا پوسٹے ہو؟ ابھی ہمارا ل | 10 | Looks genuine | No | Yes |
| hi-parcel.mp3 | hi | scam | نمسطِ آپ کے نام کا پاسل ہمارے گودام میں روکہ گیا ہے اس میں درس برامد ہوئے ہیں میں نے تو کوئی پاسل بھیجا ہی نہیں آپ کی سپتے کی بات کرے ہیں آپ کے نان پر ماملاتر دی کر دیا ہے میں ابھی | 10 | Looks genuine | No | Yes |
| hi-family.mp3 | hi | genuine | அما، میں تھوڑی دیر سے آوں گی بازار کی طرف, اولیس نے سرک بند کی ہے بس دوسری گلی سے جارے ہیں کی ہے بے کی میں کھانا گرم کر دے میں نے کہتی ہوں, تمہرے ساتھ کون ہے? میری سہلی یہی بیٹھ ہے | 10 | Looks genuine | Yes | Yes |
| hi-electric.mp3 | hi | genuine | پیتا جی میز پر بجلی قبلاکہ ہے آپ نے کہتا کہ رویوار کو ہموں سے سات دیکھ کر بھر دیں گے ہرویوار کو کی کہیں گا تو مہریمان پیچھلی رسید بھی اس میں رکھی ہے. | 10 | Looks genuine | Yes | Yes |
| te-prize.mp3 | te | scam | நமس کارم, مادو کارم, واشکا وصفم اللو, مِك بہمتِ واتِ اندِ your name is in my name. مِك بِرُ مَجَابِتَالَا مُنْدِ your name is in my name. ناکُ بُتُ لِذُ you are not a fool, I am no | 12 | Looks genuine | No | Yes |
| te-otp.mp3 | te | scam | நமسکارم میدیانکு کاتالا کچلیں پو آگیں دی مید فونکی اپنے ایک سندھے سمپنپنچان அப்பா அம்மும் கூறு கொள்ளுங்கள் அடரா எனா? நீ ஊட்டிப் பினாகு சப்பண்டி, தனிக்கிிப் போத்தம் வாளுங்டே அக்கோடு | 10 | Looks genuine | No | Yes |
| te-courier.mp3 | te | genuine | நமسکارம் வீரு அடد்டத்தில் புத்தக்கால பெட்டத்தைத்தான் என்று நீ மிகவும் என்று கேட்குத்தக்கும் வந்தான் என்று நேரும் பய் அந்தத்துவில்லை வந்தானும் கிந்தக்கும் அவளானிக்கு கொஞ்சம் சமையம் | 10 | Looks genuine | Yes | Yes |
| te-bank.mp3 | te | genuine | نمس کا رمگتا وارم میرு بیامکو ساکلو اچل دراکہ سو سداما اندی میکتا پاسمکمہ کنتا دا گرومدی  ― ھاں ھاں ھا | 10 | Looks genuine | Yes | Yes |

### Base · After

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Blocked characters |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello, I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I? Do not hang up thi | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello, we are checking a payment on your account. I just sent a message to the phone you are holding. I can't even message. What shall I do now? Help me your OTP. Read the verifica | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new passport cutout lunch last week. The passport is ready for you to pick up. Can I come after I take my lunch on? of course. The branch ope | 8 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. What you mind leaving the mark set the front | 8 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | Namaste, your mobile is in the business of the company, today your SIM will be closed, it is still about that, my phone is still running காமே דுகான் பராக புற்ற சற்றிஷயா பன் புறக்கி | 10 | Looks genuine | No | No |
| hi-parcel.mp3 | hi | scam | νமस்டை, அவ்வளுக்கு, நாம் காபாச் சல், அமரு, கூடாம், மேருக்காக, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவளுக்கு, அவள Aap | 9 | Looks genuine | No | No |
| hi-family.mp3 | hi | genuine | அம்மா, I will come a little late, Bazar's side, Ulysses has closed the church, just going from the other street. What is it? I will feed the baby, துமானே, துமானே, துமானே, துமானே, த | 7 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | Father, the man on the table was called to see Raviwar with us. | 8 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | �έ�viya We have not seen this beauty in the world, how did you get this beauty? In the past few years, your name is also mentioned in the world, we have started a physical challeng | 13 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | νамашカルム cases your name is a girl, your name is a girl, your phone is a girl, now you are a person, a person is a person, I am a scientist ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, | 11 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | �έ�viya � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ή�work, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork, � ú�ήwork | 9 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | Namaskaram Gatham, Varam, Miru, Bhavamku, Sakhalo and Dharakaasur Siddham, your son is in the hospital. I am a person who is a doctor. | 10 | Looks genuine | Yes | No |

### Small · Before

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Blocked characters |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello. I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I... Call my daughter | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello. We are checking a payment on your account. I just sent a message to the phone you are folding. I can't see the message. What should I do now? Tell me your OTP. Read the veri | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new Passbook at our branch last week. The Passbook is ready for you to pick up. Can I come after I take my Bronson? to school tomorrow? Of co | 7 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. Would you mind leaving me alone? the box at t | 7 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | नमस्ते आपके मुबाल खाते की जानकारी में गर्वडी है आज आपका सिम् बन्द कर दिया जाएगा ये कोल उसी के बारे में है मेरा फोंको अबही थी चल रहा है अब ही हमारा लिए खोली तुरग सत्यापन पूरग कीजीे | 11 | Looks genuine | No | No |
| hi-parcel.mp3 | hi | scam | नमस्ते आपके नाम का पासल हमारे गुदाम में रोका रहे है, उस में दर्स बरामद हुए है. मैंने तो कोई पासल बहिजा ही नहीं आपकी सपते की बात कर है. आपके नांग पर मामला दर्दिया है, मैं अबही अपने | 10 | Looks genuine | No | No |
| hi-family.mp3 | hi | genuine | आमा, मैं थोडी देर से आँँगी बाजार की तरव, उलिस ने सरक बंद की है, बस दुसरी गली से जा रही है. टीक है. बेकी मैं खाना गरम कर देखा. मेरी सहली यही बटी है, कर पूँचने से पहले मैं दूद भी ले | 11 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | पिता जी मेश पर भीज्ली कबिलका है आपने कहता की रवीवार को हम उसे साथ देख कर बहर देंगे है रवीवार को खीख हैगा तुमारी माने पिच्डी रसीड भी उसे प्रटेगा रवी� मिल گئی, मैं दोनो कागज रब दिती | 9 | Looks genuine | Yes | Yes |
| te-prize.mp3 | te | scam | नमस्कारम, मा दूकानम, वाशिकवषवमलो मीकु बहुमत्य वच्छिन्दि, मी पेर मा जावितालो वंदि. नाकू भूथ दू लेएदू, नेनी एप पोटी लोगनो पाद्या। दूकानम लो खुन्न वारी प्याललो, मी पेवी इंच्चुकुन्नाम, | 10 | Looks genuine | No | Yes |
| te-otp.mp3 | te | scam | अपने अदेशा परप्शानु अपने अदेशा परप्शानु अदेशा परप्शानु अदेशा परप्शानु अदेशा परप्शानु अदेशा परप्शानु अदेशा परप्शानु अद मा भ्याम कु साका कु लेल आदरे ना? मी अटी पी नाकु चप्पन्दी तने क | 9 | Looks genuine | No | Yes |
| te-courier.mp3 | te | genuine | अदर प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्रदा प्र ្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្ | 9 | Looks genuine | Yes | Yes |
| te-bank.mp3 | te | genuine | दमस्कारंगता वारम् मीरु भ्याम्कु साकलो इच्ल दरकास्त्र सिद्दम हैंदी, मी कोथ पास्पो कुमा कुंटर्दा गरू रू दुएंदी. नेनु रेप अदियम आस्पत्रे कि वेंप , నిరిల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ | 8 | Looks genuine | Yes | Yes |

### Small · After

| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Blocked characters |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| en-arrest.mp3 | en | scam | Hello. I am calling from the police about an inquiry linked to your address. You are under digital arrest until we finish our checks. I do not understand. Can I... Call my daughter | 100 | Scam likely | Yes | — |
| en-otp.mp3 | en | scam | Hello. We are checking a payment on your account. I just sent a message to the phone you are folding. I can't see the message. What should I do now? Tell me your OTP. Read the veri | 88 | Scam likely | Yes | — |
| en-bank.mp3 | en | genuine | Good morning. You left a request for a new Passbook at our branch last week. The Passbook is ready for you to pick up. Can I come after I take my Bronson? to school tomorrow? Of co | 7 | Looks genuine | Yes | — |
| en-courier.mp3 | en | genuine | Hello, this is your delivery driver. The box from the bookshop is here. I am standing by the side gate. I am just finishing breakfast. Would you mind leaving me alone? the box at t | 7 | Looks genuine | Yes | — |
| hi-sim.mp3 | hi | scam | नमस्ते आपके मुबाल खाते की जानकारी में गर्वडी है आज आपका सिम् बन्द कर दिया जाएगा ये कोल उसी के बारे में है मेरा फोंको अबही थी चल रहा है अब ही हमारा लिए खोली तुरग सत्यापन पूरग कीजीे | 11 | Looks genuine | No | No |
| hi-parcel.mp3 | hi | scam | नमस्ते आपके नाम का पासल हमारे गुदाम में रोका रहे है, उस में दर्स बरामद हुए है. मैंने तो कोई पासल बहिजा ही नहीं आपकी सपते की बात कर है. आपके नांग पर मामला दर्दिया है, मैं अबही अपने | 10 | Looks genuine | No | No |
| hi-family.mp3 | hi | genuine | आमा, मैं थोडी देर से आँँगी बाजार की तरव, उलिस ने सरक बंद की है, बस दुसरी गली से जा रही है. टीक है. बेकी मैं खाना गरम कर देखा. मेरी सहली यही बटी है, कर पूँचने से पहले मैं दूद भी ले | 11 | Looks genuine | Yes | No |
| hi-electric.mp3 | hi | genuine | पिता जी मेश पर भीज्ली कबिलका है आपने कहता की रवीवार को हम उसे साथ देख कर बहर देंगे है रवीवार को खीख हैगा तुमारी माने पिच्डी रसीड भी उसे प्रटेगा रवी� मिल गेई मैं दोनो कागस रप दिती ह | 9 | Looks genuine | Yes | No |
| te-prize.mp3 | te | scam | � now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now, now | 10 | Looks genuine | No | No |
| te-otp.mp3 | te | scam | � now, I sent a message to your phone. �コ� att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att att a | 10 | Looks genuine | No | No |
| te-courier.mp3 | te | genuine | � now ្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្្� | 10 | Looks genuine | Yes | No |
| te-bank.mp3 | te | genuine | � now , నిరిల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల్ల �コ� att | 10 | Looks genuine | Yes | No |

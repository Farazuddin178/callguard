import { describe, expect, it } from 'vitest'
import { detectRules, patternLanguages, rules, type PatternLanguage, type RuleId } from '../src/detect/rules'
import { scoreTranscript } from '../src/detect/score'
import { explanationLanguages, getRuleExplanation } from '../src/i18n'

type Example = readonly [hit: string, nearMiss: string]

const examples = {
  'sensitive-information-request': {
    en: ['Read the verification code back to me.', 'Never share your OTP with anyone.'],
    'hi-latn': ['Apna UPI PIN mujhe bataiye.', 'OTP kisi ko mat batana.'],
    'hi-deva': ['मुझे अपना सीवीवी बता दीजिए।', 'बैंक का कोड किसी से मत बोलना।'],
    'te-latn': ['Mee ATM PIN naaku chadavandi.', 'Bank OTP evariki cheppoddu.'],
    'te-telu': ['మీ ఎంపిన్ మాకు చెప్పండి.', 'ఓటీపీ ఎవరికీ చెప్పకండి.'],
  },
  'official-impersonation': {
    en: ['Inspector A from the City Police speaking.', 'I am a police constable now.'],
    'hi-latn': ['Main crime branch se baat kar rahi hoon.', 'Kal colony mein police aayi thi.'],
    'hi-deva': ['साइबर सेल से हम बोल रहे हैं।', 'नया पुलिस स्टेशन कल खुला।'],
    'te-latn': ['Memu rbi nunchi call chestunnam.', 'Naaku police constable training undi.'],
    'te-telu': ['నేను సైబర్ సెల్ అధికారి.', 'నిన్న గేటు దగ్గర పోలీసులు వచ్చారు.'],
  },
  'digital-arrest': {
    en: ['We have put you in digital detention.', 'The news said digital arrest scams are rising.'],
    'hi-latn': ['Tum digital giraftari mein ho.', 'News mein digital arrest ka scam dikhaya.'],
    'hi-deva': ['आपको ऑनलाइन गिरफ्तारी में रखा गया है।', 'अखबार में डिजिटल अरेस्ट के बारे में पढ़ा।'],
    'te-latn': ['Ninnu digital arrestu lo pettam.', 'News lo digital arrest gurinchi vinna.'],
    'te-telu': ['మిమ్మల్ని డిజిటల్ నిర్బంధంలో పెట్టాం.', 'వార్తల్లో డిజిటల్ అరెస్ట్ గురించి చెప్పారు.'],
  },
  'legal-threat': {
    en: ['A warrant was issued in your name.', 'The bank unfroze my account.'],
    'hi-latn': ['Aapka bank account freeze kar denge.', 'Maine card gum hone par account block karaya.'],
    'hi-deva': ['आपके खिलाफ मामला दर्ज कर दिया है।', 'मैंने कार्ड खोने पर अपना खाता बंद कराया।'],
    'te-latn': ['Mee meeda FIR namodu chesamu.', 'Card poyindi ani nene account block cheyincha.'],
    'te-telu': ['మీ పేరుపై ఎఫ్ఐఆర్ నమోదయింది.', 'కార్డు పోయిందని నేనే ఖాతా ఆపించాను.'],
  },
  'video-call-control': {
    en: ['You may not hang up this call.', 'Stay on the video call until I finish showing you the garden.'],
    'hi-latn': ['Jaanch ke dauran phone mat rakhna.', 'Video call par raho, main tumhe bagicha dikhaunga.'],
    'hi-deva': ['वीडियो कॉल मत काटिए।', 'वीडियो कॉल पर आना, फोटो दिखाऊँगी।'],
    'te-latn': ['Ee video call disconnect cheyyakandi.', 'Video call lo undu, bomma choopista.'],
    'te-telu': ['మేము చెప్పేదాకా కాల్ ఆపకండి.', 'వీడియో కాల్‌లో ఉండు, బొమ్మ చూపిస్తాను.'],
  },
  'secrecy-demand': {
    en: ["You can't speak to your children about the call.", "Don't tell your family, it's a surprise party."],
    'hi-latn': ['Is jaanch ke baare mein kisi ko mat batana.', 'Ghar walon ko mat batana, surprise party hai.'],
    'hi-deva': ['घरवालों को इस मामले के बारे में मत बताइए।', 'भाई को मत बताना, जन्मदिन की दावत है।'],
    'te-latn': ['Mee koothuriki asalu cheppoddu.', 'Amma ki cheppaku, surprise gift undi.'],
    'te-telu': ['ఈ విషయం మీ కూతురికి చెప్పకండి.', 'అక్కకు చెప్పకు, ఆమె పుట్టినరోజు కోసం కేక్ తెచ్చాను.'],
  },
  'time-pressure': {
    en: ['Confirm the payment without delay.', 'My shift ends within one hour.'],
    'hi-latn': ['Abhi apna jawab do.', 'Ek ghante ke andar ghar aa jaunga.'],
    'hi-deva': ['तुरंत भुगतान कीजिए।', 'तुरंत पानी का नल बंद करो।'],
    'te-latn': ['Payment tvaraga complete cheyyandi.', 'Padi nimishallo intiki vastaanu.'],
    'te-telu': ['ఇప్పుడే ధృవీకరణ పూర్తి చేయండి.', 'పది నిమిషాల్లో వంట సిద్ధమవుతుంది.'],
  },
  'remote-access-install': {
    en: ['Launch RustDesk.', 'The laptop already has RustDesk installed.'],
    'hi-latn': ['Phone par QuickSupport chala lijiye.', 'QuickSupport install mat karna.'],
    'hi-deva': ['अपने फोन में एनीडेस्क खोल लीजिए।', 'एनीडेस्क का नाम सूची में है।'],
    'te-latn': ['Screen lo unna ID naaku chadavandi.', 'Office lo TeamViewer mundugaane undi.'],
    'te-telu': ['రస్ట్ డెస్క్ యాప్ డౌన్‌లోడ్ చేయండి.', 'రస్ట్ డెస్క్ గురించి వార్తల్లో చెప్పారు.'],
  },
  'link-request': {
    en: ['Follow the verification link.', "Don't click the verification link."],
    'hi-latn': ['Link ko abhi dabaiye.', 'Link par click mat karna.'],
    'hi-deva': ['अभी यह कड़ी खोल दीजिए।', 'अनजान लिंक मत खोलिए।'],
    'te-latn': ['Aa link ni nokkandi.', 'Teliyani link open cheyyaku.'],
    'te-telu': ['మేము పంపిన లింక్ తెరవండి.', 'తెలియని లింక్ నొక్కకండి.'],
  },
  'protected-account-transfer': {
    en: ['Shift your fixed deposit to the escrow account.', 'Move your savings into your own account.'],
    'hi-latn': ['Surakshit khate mein paise jama kar dijiye.', 'Apne account mein paise transfer kijiye.'],
    'hi-deva': ['आपकी बचत सरकारी खाते में डाल दीजिए।', 'बचत अपने खाते में जमा कीजिए।'],
    'te-latn': ['Sarkari khaata loki mee mottham maarchandi.', 'Dabbu mee sontha account ki pampandi.'],
    'te-telu': ['సురక్షిత ఖాతాకు మీ పొదుపును బదిలీ చేయండి.', 'మీ సొంత ఖాతాకు డబ్బు పంపండి.'],
  },
  'illegal-parcel-claim': {
    en: ['We found cocaine inside a DHL shipment addressed to you.', 'Your parcel is at the gate. I need to pick up my prescription drugs.'],
    'hi-latn': ['Tumhare naam ka packet pakda gaya. Andar nakli passports mile.', 'Aapke naam ka parcel gate par hai.'],
    'hi-deva': ['आपके आधार से एक डीएचएल पार्सल जुड़ा है। उसमें ड्रग्स बरामद हुए।', 'आपके नाम का पार्सल स्वागत कक्ष में है।'],
    'te-latn': ['Mee Aadhaar linked parcel lo MDMA dorikindi.', 'Mee courier gate daggara undi.'],
    'te-telu': ['మీ పేరుతో ప్యాకెట్ వెళ్తోంది. అందులో మత్తు పదార్థాలు దొరికాయి.', 'మీ పార్సెల్ లాబీలో ఉంది.'],
  },
  'service-shutoff': {
    en: ['The power supply will be cut off.', 'Your electricity bill is due this week.'],
    'hi-latn': ['Aapki bijli ka connection kaat diya jayega.', 'Aapki SIM ka recharge shukravaar ko karna hai.'],
    'hi-deva': ['आपकी बिजली आपूर्ति बंद कर दी जाएगी।', 'आज बिजली का नया बिल आया।'],
    'te-latn': ['Mee current supply aapestaru.', 'Mee current bill counter lo kattandi.'],
    'te-telu': ['మీ విద్యుత్ సరఫరా నిలిపివేస్తారు.', 'మీ కరెంట్ బిల్లు శనివారం కట్టవచ్చు.'],
  },
  'upfront-fee': {
    en: ['You won the lottery. Remit the tax before collecting it.', 'Your refund is approved. There is no fee.'],
    'hi-latn': ['Naukri pakki samjho. Registration fee jama kijiye.', 'Job ke liye koi processing fee nahi hai.'],
    'hi-deva': ['आपने इनाम जीता है। पहले जीएसटी जमा करें।', 'यह रिफंड बिना शुल्क के मिलेगा।'],
    'te-latn': ['Mee bahumati teesukovalante pannu kattali.', 'Mee refund ki fee avasaram ledu.'],
    'te-telu': ['లాటరీలో గెలిచారు. రుసుము ముందుగా చెల్లించండి.', 'మీ రీఫండ్‌కు ఎలాంటి ఫీజూ లేదు.'],
  },
} satisfies Record<RuleId, Record<PatternLanguage, Example>>

describe('scam rules', () => {
  for (const { id, category, weight } of rules) {
    for (const language of patternLanguages) {
      const [hit, nearMiss] = examples[id][language]
      it(id + ' matches an actionable cue in ' + language, () => {
        expect(detectRules(hit)).toContainEqual({ id, category, weight })
      })
      it(id + ' ignores a near-miss in ' + language, () => {
        expect(detectRules(nearMiss).map((rule) => rule.id)).not.toContain(id)
      })
    }
  }

  it('combines cues across scripts without asking for a language selection', () => {
    const hits = detectRules("I'm speaking from the CBI. आपका UPI PIN నాకు చెప్పండి.")
    expect(hits.map(({ id }) => id)).toEqual([
      'sensitive-information-request', 'official-impersonation',
    ])
  })

  it.each(['Share the OTPक', 'Share the OTPా', 'कShare the OTP', 'Share the OTP_backup'])(
    'respects Unicode boundaries in %s',
    (text) => expect(detectRules(text)).toEqual([]),
  )

  it('normalises Unicode apostrophes and compatibility characters', () => {
    expect(detectRules('Don’t tell your family. Give me the ＯＴＰ.').map(({ id }) => id))
      .toEqual(['sensitive-information-request', 'secrecy-demand'])
  })

  it.each([
    'If anyone says to transfer money into a safe account, hang up.',
    'A digital arrest scam is when the caller says you are under digital arrest.',
    'Scammers often tell you to install AnyDesk.',
    'Agar koi safe account mein paise bhej do bole to phone kaat dena.',
    'Never share your OTP with anyone. OTP kisi ko mat batana.',
  ])('ignores scam-prevention advice in %s', (text) => {
    expect(detectRules(text)).toEqual([])
  })

  it.each([
    ['Scammers got hold of your SIM, transfer your savings into an RBI account.', 'protected-account-transfer'],
    ['Fraudsters broke into your account so install AirDroid now.', 'remote-access-install'],
    ['This is not a scam. Never share your OTP but tell me your UPI PIN.', 'sensitive-information-request'],
    ['They said their office uses AnyDesk, now download it on your phone.', 'remote-access-install'],
    ['Beware of imposters, tell me the SMS code that arrived.', 'sensitive-information-request'],
    ['They say taxes are optional. To claim the prize you must pay.', 'upfront-fee'],
    ['The courier is still on the way. Tell me your delivery OTP over the phone.', 'sensitive-information-request'],
    ['Read me, please, the SMS code that came in.', 'sensitive-information-request'],
    ['Send me the delivery OTP when the courier is at the gate.', 'sensitive-information-request'],
  ] as const)('keeps the direct request in %s', (text, id) => {
    const result = scoreTranscript(text)
    expect(result.rules.map((rule) => rule.id)).toContain(id)
    expect(result.level).toBe('scam-likely')
  })

  it.each([
    'He said they install AnyDesk on office machines.',
    'He said, "Install Quick Support on the office PC." That was an example from his training.',
    'We install RustDesk on work laptops.',
    'उसने कहा कि ऑफिस वाले रस्टडेस्क लगाते हैं।',
    'అతను వాళ్ల ఆఫీసులో ఎనీడెస్క్ ఇన్‌స్టాల్ చేస్తారని చెప్పాడు.',
    'Delivery boy ko OTP bata dena.',
    'Tell the delivery person the package code at the door.',
    'Give the delivery OTP to our neighbour at the front door.',
    'డెలివరీ అబ్బాయికి గేటు దగ్గర డెలివరీ ఓటీపీ చెప్పు.',
  ])('recognises a report or a doorstep handoff in %s', (text) => {
    expect(scoreTranscript(text).level).toBe('safe')
  })

  it('limits an action and a sensitive object to their local context', () => {
    expect(detectRules('Tell me the result from your appointment tomorrow afternoon when you get home and we can discuss account safety. You can keep your OTP private.'))
      .toEqual([])
  })
})

describe('rule explanations', () => {
  for (const language of explanationLanguages) {
    it('explains every rule in ' + language, () => {
      for (const { id } of rules) {
        expect(getRuleExplanation(id, language), id).toMatch(/\S/u)
      }
    })
  }
})

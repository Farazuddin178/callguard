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


const reviewCases = {
  en: {
    relay: [
      'Fraudsters changed your bank record, so send the remainder to the RBI account.',
      'The bank circulated a warning: fraudsters ask you to move savings into a safe account. Never do that.',
    ],
    transfer: ['Shift all of it into the escrow account.', 'Move all of it from the escrow account to your savings.'],
    parcel: [
      'Your Aadhaar is tied to a package from a FedEx depot. They found drugs and forged passports inside.',
      'An old report said an ID is linked to a DHL package. It contained drugs and fake passports.',
    ],
    callback: [
      'Your telephone number will be disconnected tomorrow. Ring this number right now.',
      'The electricity bill is due next week. Call your sister right away.',
    ],
    deadline: [
      'Your SIM will be suspended by nightfall.',
      'Scheduled maintenance will shut off the power supply tonight.',
    ],
  },
  'hi-latn': {
    relay: [
      'Thagon ne aapke SIM ka galat istemal kiya, isliye saare paise RBI account mein bhej dijiye.',
      'Ghar pe bank ka alert aaya. Thag aapse paise safe account mein bhejne ko kahenge. Unhe kuchh mat dena.',
    ],
    transfer: ['Sab kuchh surakshit khate mein daal dijiye.', 'Safe account se sab kuchh apne khate mein bhej dijiye.'],
    parcel: [
      'Aapka mobile number ek FedEx parcel se link hua hai. Uske andar nashila samaan aur passports mile.',
      'Kisi ka mobile number ek courier packet se juda tha. Usmein nakli passport nikla.',
    ],
    callback: [
      'Bijli ka connection kal kaat diya jayega. Turant is number par call kijiye.',
      'Bijli ka bill kal aayega. Turant ghar par baat karo.',
    ],
    deadline: [
      'Aaj aapka mobile number band kar diya jayega.',
      'Aapka SIM aaj band ho gaya. Naya SIM milte hi bata dena.',
    ],
  },
  'hi-deva': {
    relay: [
      'ठगों ने आपका खाता इस्तेमाल किया है, इसलिए रकम आरबीआई के खाते में भेज दीजिए।',
      'बैंक ने घर पर चेतावनी भेजी। ठग आपको बचत सुरक्षित खाते में भेजने को कहेंगे। उनकी बात कभी मत मानना।',
    ],
    transfer: ['बाकी सब कुछ एस्क्रो खाते में डाल दीजिए।', 'एस्क्रो खाते से बाकी सब अपने खाते में भेजिए।'],
    parcel: [
      'आपकी आईडी फेडएक्स के एक पैकेट पर पंजीकृत है। उसमें ड्रग्स और नकली पासपोर्ट मिले हैं।',
      'किसी की आईडी कूरियर के पैकेट पर दर्ज थी। उसके अंदर ड्रग्स बरामद हुए।',
    ],
    callback: [
      'कल आपका सिम बंद कर दिया जाएगा। इस नंबर पर फ़ौरन कॉल कीजिए।',
      'बिजली का बिल आ गया है। समय मिले तो इस नंबर पर फोन करिए।',
    ],
    deadline: [
      'आपका केवाईसी खत्म हो गया है और आपका सिम आज रात ब्लॉक होगा।',
      'आज शाम मरम्मत के लिए बिजली की सप्लाई बंद रहेगी।',
    ],
  },
  'te-latn': {
    relay: [
      'Mosagallu mee SIM vaadaru kabatti antha RBI account loki pampandi.',
      'Bank heccharika pampindi. Mosagaallu mee savings safe account ki pampamani antaru. Valla maata vinakandi.',
    ],
    transfer: ['Motham antha escrow account ki pampinchandi.', 'Mee safe account nunchi motham mee sontha account ki pampinchandi.'],
    parcel: [
      'Mee Aadhaar oka FedEx parcel ki jatha chesaru. Andulo nakili passport mariyu MDMA dorikindi.',
      'Oka Aadhaar number DHL packet tho link ayindi. Andulo nakili passports unnayi.',
    ],
    callback: [
      'Mee SIM repu block avutundi. Ee number ki ventane call cheyyandi.',
      'Electricity bill vachindi. Mee akka ki ippude phone cheyyandi.',
    ],
    deadline: [
      'Ivala mee mobile number block avutundi.',
      'Ee roju current block ayyindi. Malli on chesaru.',
    ],
  },
  'te-telu': {
    relay: [
      'మోసగాళ్లు మీ సిమ్ వాడారు కాబట్టి డబ్బంతా ఆర్‌బీఐ ఖాతాకు పంపండి.',
      'ఇంట్లో వాళ్లు బ్యాంకు హెచ్చరిక చెప్పారు. మోసగాళ్లు డబ్బు సురక్షిత ఖాతాకు పంపమని చెబుతారు. అలా చేయవద్దు.',
    ],
    transfer: ['ఉన్నదంతా ప్రభుత్వ ఖాతాకు బదిలీ చేయండి.', 'ప్రభుత్వ ఖాతా నుంచి ఉన్నదంతా మీ సొంత ఖాతాకు పంపండి.'],
    parcel: [
      'మీ ఫోన్ నంబర్ ఫెడెక్స్ పార్సెల్‌తో అనుసంధానం అయింది. లోపల డ్రగ్స్‌తో పాటు పాస్‌పోర్టులు దొరికాయి.',
      'ఒక వ్యక్తి ఫోన్ నంబర్ ఫెడెక్స్ పార్సెల్‌కు జత అయింది. అందులో నకిలీ పాస్‌పోర్టులు దొరికాయి.',
    ],
    callback: [
      'రేపు సిమ్ బ్లాక్ చేస్తారు. ఈ నంబరుకు ఇప్పుడే కాల్ చేయండి.',
      'కరెంట్ బిల్లు వచ్చింది. సమయం ఉన్నప్పుడు ఈ నంబరుకు ఫోన్ చేయండి.',
    ],
    deadline: [
      'ఈ రోజు రాత్రి మీ ఫోన్ సిమ్ బ్లాక్ చేస్తాం.',
      'ఈ రాత్రి నిర్వహణ పనుల కోసం విద్యుత్ సరఫరా నిలిపివేస్తారు.',
    ],
  },
} satisfies Record<PatternLanguage, Record<'relay' | 'transfer' | 'parcel' | 'callback' | 'deadline', Example>>

describe('second detector review regressions', () => {
  for (const language of patternLanguages) {
    const cases = reviewCases[language]
    it('separates a relayed fraud warning from a direct request in ' + language, () => {
      const [request, warning] = cases.relay
      expect(detectRules(warning)).toEqual([])
      expect(scoreTranscript(request).level).toBe('scam-likely')
      expect(detectRules(request).map(({ id }) => id)).toContain('protected-account-transfer')
    })

    const affected = [
      ['transfer', 'protected-account-transfer'],
      ['parcel', 'illegal-parcel-claim'],
      ['callback', 'time-pressure'],
      ['deadline', 'time-pressure'],
    ] as const
    for (const [scenario, rule] of affected) {
      const [hit, nearMiss] = cases[scenario]
      it(scenario + ' distinguishes a hit from a near-miss in ' + language, () => {
        expect(detectRules(hit).map(({ id }) => id)).toContain(rule)
        expect(scoreTranscript(hit).level).toBe('scam-likely')
        expect(detectRules(nearMiss).map(({ id }) => id)).not.toContain(rule)
        expect(scoreTranscript(nearMiss).level).not.toBe('scam-likely')
      })
    }
  }

  it('recognises an attributed demand after a comma and a distinct later instruction', () => {
    const warning = 'Such callers may say, wire everything to a secure account.'
    expect(detectRules(warning)).toEqual([])
    expect(scoreTranscript(warning + ' But move the full amount to the RBI account now.').level)
      .toBe('scam-likely')
  })

  it('treats a passive request in a bank warning as relayed', () => {
    expect(detectRules('A bank alert came in. You may be asked to move everything to a secure account. Never comply.'))
      .toEqual([])
  })

  it.each([
    'Fraudsters sometimes ask you to shift your entire balance into a holding account.',
    'Aise log aapko sab kuch escrow account mein daalne ko bolte hain.',
    'फर्जी कॉलर कहते हैं कि सब कुछ एस्क्रो खाते में डाल दीजिए।',
    'Mosagallu escrow account ki antha pampamani adugutaru.',
    'మోసగాళ్లు ఉన్నదంతా సురక్షిత ఖాతాకు పంపమని అడుగుతారు.',
  ])('recognises a generic scam description without a separate warning in %s', (text) => {
    expect(detectRules(text)).toEqual([])
  })

  it('distinguishes a deposit balance from an active instruction', () => {
    expect(detectRules('Your fixed deposit is held in an escrow account.')).toEqual([])
    expect(scoreTranscript('Deposit the rest into an escrow account.').level).toBe('scam-likely')
  })

  it('requires a deadline on an impending cutoff, not merely two service claims', () => {
    const result = scoreTranscript('Your KYC expired. Your SIM will be blocked.')
    expect(result.rules.map(({ id }) => id)).toEqual(['service-shutoff'])
    expect(result.level).toBe('careful')
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

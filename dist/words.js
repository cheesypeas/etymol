const words = [
  {
    word: "coyote",
    etymology: ["Spanish", "Nahuatl"],
    descriptions: [
      "'Coyote' entered English in the 18th century from Spanish, where it referred to the wild canine native to North America. The word was used by Spanish speakers in Mexico and the American Southwest to describe this animal.",
      "Spanish borrowed 'coyote' from Nahuatl, the language of the Aztecs, where it was 'coyotl'."
    ]
  },
  {
    word: "algebra",
    etymology: ["Latin", "Arabic"],
    descriptions: [
      "'Algebra' was adopted into English through Medieval Latin, where it referred to the branch of mathematics dealing with equations and variables. The term became widely used in Europe during the Middle Ages.",
      "Latin borrowed it from Arabic 'al-jabr', meaning 'reunion of broken parts', which was part of the title of a famous mathematical treatise by al-Khwarizmi."
    ]
  },
  {
    word: "safari",
    etymology: ["Swahili", "Arabic"],
    descriptions: [
      "'Safari' entered English in the late 19th century from Swahili, where it means 'journey' or 'expedition', especially one for hunting or exploring in East Africa. The word became associated with travel and adventure in the African wilderness.",
      "Swahili borrowed it from Arabic 'safar', meaning 'journey' or 'travel'."
    ]
  },
  {
    word: "bungalow",
    etymology: ["Hindi", "Urdu", "Gujarati"],
    descriptions: [
      "'Bungalow' entered English from Hindi, where it referred to a type of house built in the Bengal style.",
      "Hindi borrowed the word from Urdu, which also used it to describe a house or cottage.",
      "Urdu ultimately derived it from Gujarati 'baṅgalo', meaning 'in the Bengal style'."
    ]
  },
  {
    word: "ketchup",
    etymology: ["Malay", "Hokkien Chinese"],
    descriptions: [
      "'Ketchup' came into English from Malay, where it referred to a type of fermented fish sauce.",
      "Malay borrowed the word from Hokkien Chinese 'kê-tsiap', a term for a brine of pickled fish or shellfish."
    ]
  },
  {
    word: "shampoo",
    etymology: ["Hindi", "Urdu"],
    descriptions: [
      "'Shampoo' entered English from Hindi, where it meant to press or massage.",
      "Hindi borrowed the word from Urdu 'chāmpo', which also referred to massaging or kneading."
    ]
  },
  {
    word: "sugar",
    etymology: ["French", "Italian", "Arabic", "Sanskrit"],
    descriptions: [
      "'Sugar' entered English from French 'sucre', which referred to the sweet crystalline substance.",
      "French borrowed it from Italian 'zucchero'.",
      "Italian got the word from Arabic 'sukkar'.",
      "Arabic ultimately derived it from Sanskrit 'śarkarā', meaning 'gravel' or 'ground sugar'."
    ]
  },
  {
    word: "jungle",
    etymology: ["Hindi", "Sanskrit"],
    descriptions: [
      "'Jungle' entered English from Hindi, where it referred to uncultivated land or wilderness.",
      "Hindi borrowed the word from Sanskrit 'jangala', meaning 'rough and arid terrain'."
    ]
  },
  {
    word: "zero",
    etymology: ["Italian", "Arabic"],
    descriptions: [
      "'Zero' entered English from Italian 'zero', which was used in mathematics to represent the absence of quantity.",
      "Italian borrowed it from Arabic 'ṣifr', meaning 'empty' or 'nothing'."
    ]
  },
  {
    word: "guitar",
    etymology: ["Spanish", "Greek"],
    descriptions: [
      "'Guitar' entered English from Spanish 'guitarra', referring to the stringed musical instrument.",
      "Spanish borrowed it from Greek 'kithara', an ancient stringed instrument."
    ]
  },
  {
    word: "orange",
    etymology: ["Old French", "Arabic", "Persian", "Sanskrit"],
    descriptions: [
      "'Orange' entered English from Old French 'orenge', referring to the fruit.",
      "Old French borrowed it from Arabic 'nāranj'.",
      "Arabic got it from Persian 'nārang'.",
      "Persian ultimately derived it from Sanskrit 'nāraṅga', meaning 'orange tree'."
    ]
  },
  {
    word: "checkmate",
    etymology: ["Old French", "Arabic", "Persian"],
    descriptions: [
      "'Checkmate' entered English from Old French 'eschec mat', a term used in chess.",
      "Old French borrowed it from Arabic 'shāh māt', meaning 'the king is helpless'.",
      "Arabic got it from Persian 'shāh māt', with the same meaning."
    ]
  },
  {
    word: "arsenal",
    etymology: ["Italian", "Arabic"],
    descriptions: [
      "'Arsenal' entered English from Italian 'arsenale', meaning a dockyard or armory.",
      "Italian borrowed it from Arabic 'dār al-ṣināʿa', meaning 'house of manufacture'."
    ]
  },
  {
    word: "hazard",
    etymology: ["Old French", "Arabic"],
    descriptions: [
      "'Hazard' entered English from Old French 'hasard', referring to a game of chance or risk.",
      "Old French borrowed it from Arabic 'al-zahr', meaning 'dice'."
    ]
  },
  {
    word: "magazine",
    etymology: ["French", "Italian", "Arabic"],
    descriptions: [
      "'Magazine' entered English from French 'magasin', meaning a storehouse or shop.",
      "French borrowed it from Italian 'magazzino'.",
      "Italian got it from Arabic 'makhazin', meaning 'storehouses'."
    ]
  },
  {
    word: "sofa",
    etymology: ["Turkish", "Arabic"],
    descriptions: [
      "'Sofa' entered English from Turkish 'sofa', meaning a raised platform or bench.",
      "Turkish borrowed it from Arabic 'ṣuffa', meaning a long bench or couch."
    ]
  },
  {
    word: "alcohol",
    etymology: ["French", "Arabic"],
    descriptions: [
      "'Alcohol' entered English from French 'alcool', referring to the distilled substance.",
      "French borrowed it from Arabic 'al-kuḥl', meaning 'the kohl' (a fine powder), later used for distilled substances."
    ]
  },
  {
    word: "admiral",
    etymology: ["Old French", "Arabic"],
    descriptions: [
      "'Admiral' entered English from Old French 'amiral', meaning a naval commander.",
      "Old French borrowed it from Arabic 'amīr al-', meaning 'commander of the...'."
    ]
  },
  {
    word: "caravan",
    etymology: ["French", "Persian"],
    descriptions: [
      "'Caravan' entered English from French 'caravane', referring to a group of travelers.",
      "French borrowed it from Persian 'kārvān', meaning a group of travelers or merchants."
    ]
  },
  {
    word: "camphor",
    etymology: ["French", "Latin", "Arabic", "Sanskrit"],
    descriptions: [
      "'Camphor' entered English from French 'camphre', a term for the aromatic substance.",
      "French borrowed it from Latin 'camphora'.",
      "Latin got it from Arabic 'kāfūr'.",
      "Arabic ultimately derived it from Sanskrit 'karpūra', meaning 'camphor'."
    ]
  },
  {
    word: "cipher",
    etymology: ["French", "Italian", "Arabic"],
    descriptions: [
      "'Cipher' entered English from French 'cifre', meaning a code or zero.",
      "French borrowed it from Italian 'cifra'.",
      "Italian got it from Arabic 'ṣifr', meaning 'zero' or 'empty'."
    ]
  },
  {
    word: "coffee",
    etymology: ["Italian", "Turkish", "Arabic"],
    descriptions: [
      "'Coffee' entered English from Italian 'caffè', referring to the beverage.",
      "Italian borrowed it from Turkish 'kahve'.",
      "Turkish got it from Arabic 'qahwa', meaning 'coffee'."
    ]
  },
  {
    word: "cotton",
    etymology: ["French", "Italian", "Arabic"],
    descriptions: [
      "'Cotton' entered English from French 'coton', referring to the textile fiber.",
      "French borrowed it from Italian 'cotone'.",
      "Italian got it from Arabic 'quṭn', meaning 'cotton'."
    ]
  },
  {
    word: "lemon",
    etymology: ["Old French", "Arabic", "Persian"],
    descriptions: [
      "'Lemon' entered English from Old French 'limon', referring to the citrus fruit.",
      "Old French borrowed it from Arabic 'laymūn'.",
      "Arabic got it from Persian 'limun', meaning 'lemon'."
    ]
  },
  {
    word: "rice",
    etymology: ["Old French", "Italian", "Greek"],
    descriptions: [
      "'Rice' entered English from Old French 'ris', referring to the grain.",
      "Old French borrowed it from Italian 'riso'.",
      "Italian got it from Greek 'oryza', meaning 'rice'."
    ]
  },
  {
    word: "spinach",
    etymology: ["Old French", "Arabic", "Persian"],
    descriptions: [
      "'Spinach' entered English from Old French 'espinache', referring to the leafy vegetable.",
      "Old French borrowed it from Arabic 'isfānākh'.",
      "Arabic got it from Persian 'aspanakh', meaning 'spinach'."
    ]
  },
  {
    word: "tariff",
    etymology: ["Italian", "Arabic"],
    descriptions: [
      "'Tariff' entered English from Italian 'tariffa', meaning a list of prices or duties.",
      "Italian borrowed it from Arabic 'taʕārīf', meaning 'notification' or 'inventory'."
    ]
  },
  {
    word: "zenith",
    etymology: ["Old French", "Arabic"],
    descriptions: [
      "'Zenith' entered English from Old French 'cenith', referring to the highest point in the sky.",
      "Old French borrowed it from Arabic 'samt', meaning 'direction' or 'path'."
    ]
  },
  {
    word: "arsenic",
    etymology: ["Latin", "Greek"],
    descriptions: [
      "'Arsenic' entered English from Latin 'arsenicum', referring to the chemical element.",
      "Latin borrowed it from Greek 'arsenikon', meaning 'yellow orpiment'."
    ]
  },
  {
    word: "balcony",
    etymology: ["Italian", "German"],
    descriptions: [
      "'Balcony' entered English from Italian 'balcone', meaning a platform or gallery.",
      "Italian borrowed it from German 'Balkon', meaning 'beam' or 'railing'."
    ]
  },
  {
    word: "barricade",
    etymology: ["French", "Italian"],
    descriptions: [
      "'Barricade' entered English from French 'barricade', meaning a defensive barrier.",
      "French borrowed it from Italian 'barriacata', meaning 'barrier'."
    ]
  },
  {
    word: "bizarre",
    etymology: ["French", "Spanish"],
    descriptions: [
      "'Bizarre' entered English from French 'bizarre', meaning odd or fantastic.",
      "French borrowed it from Spanish 'bizarro', meaning brave or gallant."
    ]
  },
  {
    word: "carnival",
    etymology: ["Italian", "Latin"],
    descriptions: [
      "'Carnival' entered English from Italian 'carnevale', referring to the festive season before Lent.",
      "Italian borrowed it from Latin 'carnelevare', meaning 'to remove meat'."
    ]
  },
  {
    word: "dollar",
    etymology: ["Dutch", "German"],
    descriptions: [
      "'Dollar' entered English from Dutch 'daler', a coin used in the 16th century.",
      "Dutch borrowed it from German 'Thaler', a silver coin from the town of Joachimsthal."
    ]
  },
  {
    word: "embargo",
    etymology: ["Spanish", "Portuguese"],
    descriptions: [
      "'Embargo' entered English from Spanish 'embargo', meaning a restraint or prohibition.",
      "Spanish borrowed it from Portuguese 'embargo', with the same meaning."
    ]
  },
  {
    word: "gazette",
    etymology: ["French", "Italian"],
    descriptions: [
      "'Gazette' entered English from French 'gazette', meaning a newspaper or official journal.",
      "French borrowed it from Italian 'gazzetta', a Venetian coin used to buy early newspapers."
    ]
  },
  {
    word: "giraffe",
    etymology: ["Italian", "Arabic"],
    descriptions: [
      "'Giraffe' entered English from Italian 'giraffa', referring to the tall African mammal.",
      "Italian borrowed it from Arabic 'zarāfa', meaning 'giraffe'."
    ]
  },
  {
    word: "mosquito",
    etymology: ["Spanish", "Portuguese"],
    descriptions: [
      "'Mosquito' entered English from Spanish 'mosquito', meaning 'little fly'.",
      "Spanish borrowed it from Portuguese 'mosquito', with the same meaning."
    ]
  },
  {
    word: "mustard",
    etymology: ["French", "Latin"],
    descriptions: [
      "'Mustard' entered English from French 'moutarde', referring to the pungent condiment.",
      "French borrowed it from Latin 'mustum', meaning 'new wine', because the condiment was originally made with must (unfermented grape juice)."
    ]
  },
  {
    word: "opera",
    etymology: ["Italian", "Latin"],
    descriptions: [
      "'Opera' entered English from Italian 'opera', referring to the musical and dramatic art form.",
      "Italian borrowed it from Latin 'opera', meaning 'work' or 'labor'."
    ]
  },
  {
    word: "parade",
    etymology: ["French", "Italian"],
    descriptions: [
      "'Parade' entered English from French 'parade', meaning a public procession or display.",
      "French borrowed it from Italian 'parata', meaning 'a show' or 'preparation'."
    ]
  },
  {
    word: "patio",
    etymology: ["Spanish", "Latin"],
    descriptions: [
      "'Patio' entered English from Spanish 'patio', meaning a courtyard or open space.",
      "Spanish borrowed it from Latin 'patere', meaning 'to lie open'."
    ]
  },
  {
    word: "pistol",
    etymology: ["German", "Czech"],
    descriptions: [
      "'Pistol' entered English from German 'Pistole', referring to the firearm.",
      "German borrowed it from Czech 'píšťala', meaning 'whistle' or 'pipe'."
    ]
  },
  {
    word: "plaza",
    etymology: ["Spanish", "Latin"],
    descriptions: [
      "'Plaza' entered English from Spanish 'plaza', meaning a public square or marketplace.",
      "Spanish borrowed it from Latin 'platea', meaning 'broad street'."
    ]
  },
  {
    word: "porcelain",
    etymology: ["French", "Italian"],
    descriptions: [
      "'Porcelain' entered English from French 'porcelaine', referring to the fine ceramic material.",
      "French borrowed it from Italian 'porcellana', meaning 'cowrie shell', which the ceramic resembled."
    ]
  },
  {
    word: "quarantine",
    etymology: ["French", "Italian"],
    descriptions: [
      "'Quarantine' entered English from French 'quarantaine', meaning a period of forty days.",
      "French borrowed it from Italian 'quaranta', meaning 'forty'."
    ]
  },
  {
    word: "umbrella",
    etymology: ["Italian", "Latin"],
    descriptions: [
      "'Umbrella' entered English from Italian 'ombrella', referring to the device for protection from rain or sun.",
      "Italian borrowed it from Latin 'umbra', meaning 'shade' or 'shadow'."
    ]
  }
];

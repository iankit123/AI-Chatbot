/** Approximate coordinates for commonly entered Indian birth places (lagna needs lat/lon). */
export type GeoPoint = { lat: number; lon: number; label: string };

const CITIES: Record<string, [number, number]> = {
  delhi: [28.61, 77.21], "new delhi": [28.61, 77.21], mumbai: [19.08, 72.88], bombay: [19.08, 72.88],
  kolkata: [22.57, 88.36], calcutta: [22.57, 88.36], chennai: [13.08, 80.27], madras: [13.08, 80.27],
  bengaluru: [12.97, 77.59], bangalore: [12.97, 77.59], hyderabad: [17.39, 78.49], secunderabad: [17.44, 78.5],
  ahmedabad: [23.02, 72.57], pune: [18.52, 73.86], surat: [21.17, 72.83], jaipur: [26.91, 75.79],
  lucknow: [26.85, 80.95], kanpur: [26.45, 80.33], nagpur: [21.15, 79.09], indore: [22.72, 75.86],
  bhopal: [23.26, 77.41], patna: [25.59, 85.14], vadodara: [22.31, 73.18], baroda: [22.31, 73.18],
  ludhiana: [30.9, 75.86], agra: [27.18, 78.01], nashik: [19.99, 73.79], meerut: [28.98, 77.71],
  rajkot: [22.3, 70.8], varanasi: [25.32, 82.97], banaras: [25.32, 82.97], srinagar: [34.08, 74.8],
  aurangabad: [19.88, 75.34], dhanbad: [23.8, 86.43], amritsar: [31.63, 74.87], allahabad: [25.44, 81.85],
  prayagraj: [25.44, 81.85], ranchi: [23.34, 85.31], howrah: [22.59, 88.31], jabalpur: [23.18, 79.99],
  gwalior: [26.22, 78.18], vijayawada: [16.51, 80.65], jodhpur: [26.24, 73.02], raipur: [21.25, 81.63],
  kota: [25.21, 75.86], guwahati: [26.14, 91.74], chandigarh: [30.73, 76.78], solapur: [17.66, 75.91],
  bareilly: [28.37, 79.43], moradabad: [28.84, 78.77], mysuru: [12.3, 76.65], mysore: [12.3, 76.65],
  gurugram: [28.46, 77.03], gurgaon: [28.46, 77.03], aligarh: [27.9, 78.08], jalandhar: [31.33, 75.58],
  bhubaneswar: [20.3, 85.82], salem: [11.66, 78.15], warangal: [17.98, 79.6], guntur: [16.31, 80.44],
  bhiwandi: [19.3, 73.06], saharanpur: [29.97, 77.55], gorakhpur: [26.76, 83.37], bikaner: [28.02, 73.31],
  amravati: [20.93, 77.75], noida: [28.54, 77.39], jamshedpur: [22.8, 86.2], bhilai: [21.21, 81.38],
  cuttack: [20.46, 85.88], firozabad: [27.15, 78.4], kochi: [9.93, 76.27], cochin: [9.93, 76.27],
  dehradun: [30.32, 78.03], durgapur: [23.52, 87.31], asansol: [23.68, 86.98], nanded: [19.14, 77.32],
  kolhapur: [16.7, 74.24], ajmer: [26.45, 74.64], gulbarga: [17.33, 76.83], jamnagar: [22.47, 70.06],
  ujjain: [23.18, 75.78], loni: [28.75, 77.29], siliguri: [26.73, 88.4], jhansi: [25.45, 78.57],
  ulhasnagar: [19.22, 73.16], jammu: [32.73, 74.86], mangaluru: [12.91, 74.86], mangalore: [12.91, 74.86],
  erode: [11.34, 77.72], belgaum: [15.85, 74.5], belagavi: [15.85, 74.5], tirunelveli: [8.71, 77.76],
  malegaon: [20.55, 74.53], gaya: [24.8, 85.0], udaipur: [24.58, 73.71], kakinada: [16.99, 82.25],
  davanagere: [14.46, 75.92], kozhikode: [11.26, 75.78], calicut: [11.26, 75.78], maheshtala: [22.5, 88.25],
  rajpur: [22.4, 88.42], akola: [20.71, 77.0], kurnool: [15.83, 78.04], bokaro: [23.67, 86.15],
  bellary: [15.14, 76.92], patiala: [30.34, 76.39], agartala: [23.83, 91.28], bhagalpur: [25.24, 86.97],
  muzaffarnagar: [29.47, 77.7], bhatpara: [22.87, 88.41], panihati: [22.69, 88.37], latur: [18.4, 76.56],
  dhule: [20.9, 74.78], rohtak: [28.9, 76.6], korba: [22.35, 82.68], bhilwara: [25.35, 74.64],
  brahmapur: [19.31, 84.79], muzaffarpur: [26.12, 85.39], ahmednagar: [19.09, 74.74], mathura: [27.49, 77.67],
  kollam: [8.89, 76.61], avadi: [13.11, 80.1], kadapa: [14.47, 78.82], anantapur: [14.68, 77.6],
  kamarhati: [22.67, 88.37], sambalpur: [21.47, 83.97], bilaspur: [22.08, 82.15], shahjahanpur: [27.88, 79.91],
  satara: [17.69, 74.0], bijapur: [16.83, 75.71], rampur: [28.81, 79.03], shivamogga: [13.93, 75.57],
  chandrapur: [19.95, 79.3], junagadh: [21.52, 70.46], thrissur: [10.53, 76.21], alwar: [27.55, 76.63],
  bardhaman: [23.24, 87.86], kulti: [23.73, 86.85], kakinada2: [16.99, 82.25], nizamabad: [18.67, 78.1],
  parbhani: [19.27, 76.77], tumkur: [13.34, 77.1], khammam: [17.25, 80.15], ozhukarai: [11.95, 79.77],
  "bihar sharif": [25.2, 85.52], panipat: [29.39, 76.97], darbhanga: [26.15, 85.9], bally: [22.65, 88.34],
  aizawl: [23.73, 92.72], dewas: [22.96, 76.05], ichalkaranji: [16.69, 74.46], karnal: [29.69, 76.99],
  bathinda: [30.21, 74.95], jalna: [19.84, 75.88], eluru: [16.71, 81.1], barasat: [22.72, 88.48],
  "kirari suleman nagar": [28.72, 77.07], purnia: [25.78, 87.47], satna: [24.58, 80.83], mau: [25.94, 83.56],
  sonipat: [28.99, 77.02], farrukhabad: [27.39, 79.58], sagar: [23.84, 78.74], rourkela: [22.26, 84.85],
  durg: [21.19, 81.28], imphal: [24.82, 93.94], ratlam: [23.33, 75.04], hapur: [28.73, 77.78],
  arrah: [25.56, 84.66], anantapuram: [14.68, 77.6], karimnagar: [18.44, 79.13], etawah: [26.78, 79.02],
  ambernath: [19.2, 73.19], "north dumdum": [22.65, 88.42], bharatpur: [27.22, 77.49], begusarai: [25.42, 86.13],
  "new delhi ncr": [28.61, 77.21], gandhidham: [23.08, 70.13], baranagar: [22.64, 88.37], tiruvottiyur: [13.16, 80.3],
  pondicherry: [11.94, 79.83], puducherry: [11.94, 79.83], sikar: [27.61, 75.14], thoothukudi: [8.76, 78.13],
  rewa: [24.53, 81.3], mirzapur: [25.15, 82.57], raichur: [16.21, 77.36], pali: [25.77, 73.32],
  ramagundam: [18.76, 79.47], haridwar: [29.95, 78.16], vijayanagaram: [18.11, 83.4], katihar: [25.54, 87.57],
  nagercoil: [8.18, 77.43], "sri ganganagar": [29.9, 73.88], karawal: [28.72, 77.28], mango: [22.83, 86.22],
  thanjavur: [10.79, 79.14], bulandshahr: [28.41, 77.85], uluberia: [22.47, 88.11], murwara: [23.84, 80.39],
  sambhal: [28.58, 78.57], singrauli: [24.2, 82.67], nadiad: [22.69, 72.86], secunderabad2: [17.44, 78.5],
  naihati: [22.89, 88.42], yamunanagar: [30.13, 77.28], bidhannagar: [22.58, 88.42], pallavaram: [12.97, 80.15],
  bidar: [17.91, 77.52], munger: [25.37, 86.47], panchkula: [30.69, 76.86], burhanpur: [21.31, 76.23],
  "raurkela": [22.26, 84.85], kharagpur: [22.33, 87.32], dindigul: [10.37, 77.98], gandhinagar: [23.22, 72.65],
  hospet: [15.27, 76.39], "nangloi jat": [28.68, 77.07], malda: [25.0, 88.14], ongole: [15.5, 80.05],
  deoghar: [24.48, 86.7], chapra: [25.78, 84.75], haldia: [22.06, 88.07], khandwa: [21.83, 76.35],
  nandyal: [15.48, 78.48], morena: [26.5, 78.0], amroha: [28.9, 78.47], anand: [22.56, 72.95],
  bhind: [26.56, 78.79], bhalswa: [28.74, 77.16], madhyamgram: [22.7, 88.45], bhiwani: [28.79, 76.14],
  berhampore: [24.1, 88.25], ambala: [30.38, 76.78], morbi: [22.82, 70.84], fatehpur: [25.93, 80.8],
  raebareli: [26.23, 81.23], khora: [28.62, 77.33], chittoor: [13.22, 79.1], bhusawal: [21.04, 75.79],
  orai: [25.99, 79.45], bahraich: [27.57, 81.6], phusro: [23.77, 85.99], vellore: [12.92, 79.13],
  mehsana: [23.6, 72.38], raiganj: [25.62, 88.12], sirsa: [29.53, 75.03], danapur: [25.63, 85.04],
  serampore: [22.75, 88.34], sultan: [26.26, 82.07], guna: [24.65, 77.31], jaunpur: [25.75, 82.68],
  panvel: [18.99, 73.11], shivpuri: [25.42, 77.65], "surendranagar": [22.73, 71.65], unnao: [26.55, 80.49],
  hugli: [22.9, 88.39], alappuzha: [9.5, 76.34], kottayam: [9.59, 76.52], machilipatnam: [16.19, 81.13],
  shimla: [31.1, 77.17], adoni: [15.63, 77.28], udupi: [13.34, 74.75], tenali: [16.24, 80.65],
  proddatur: [14.75, 78.55], saharsa: [25.88, 86.6], hindupur: [13.83, 77.49], sasaram: [24.95, 84.03],
  hajipur: [25.69, 85.21], bhimavaram: [16.54, 81.52], kumbakonam: [10.96, 79.38], dehri: [24.9, 84.18],
  madanapalle: [13.55, 78.5], siwan: [26.22, 84.36], bettiah: [26.8, 84.5], guntakal: [15.17, 77.37],
  srikakulam: [18.3, 83.9], motihari: [26.65, 84.92], dharmavaram: [14.41, 77.72], gudivada: [16.43, 80.99],
  narasaraopet: [16.23, 80.05], bagaha: [27.1, 84.09], miryalaguda: [16.87, 79.57], tadipatri: [14.91, 78.01],
  kishanganj: [26.1, 87.95], karaikudi: [10.07, 78.78], suryapet: [17.14, 79.62], jamalpur: [25.31, 86.49],
  kavali: [14.91, 79.99], tadepalligudem: [16.81, 81.52], amaravati: [16.51, 80.52], buxar: [25.56, 83.98],
  tezpur: [26.63, 92.8], jehanabad: [25.21, 84.99], aurangabad_bihar: [24.75, 84.37], gangtok: [27.33, 88.61],
  itanagar: [27.08, 93.6], kohima: [25.67, 94.1], shillong: [25.58, 91.89], dispur: [26.14, 91.79],
  panaji: [15.49, 73.83], goa: [15.49, 73.83], thiruvananthapuram: [8.52, 76.94], trivandrum: [8.52, 76.94],
  coimbatore: [11.02, 76.96], madurai: [9.93, 78.12], tiruchirappalli: [10.79, 78.7], trichy: [10.79, 78.7],
  visakhapatnam: [17.69, 83.22], vizag: [17.69, 83.22], nellore: [14.44, 79.99], tirupati: [13.63, 79.42],
  hubli: [15.36, 75.12], hubballi: [15.36, 75.12], dharwad: [15.46, 75.01], faridabad: [28.41, 77.31],
  ghaziabad: [28.67, 77.42], hisar: [29.15, 75.72], jind: [29.32, 76.31], kaithal: [29.8, 76.4],
  kurukshetra: [29.97, 76.88], rewari: [28.2, 76.62], palwal: [28.14, 77.33], muzaffarnagar2: [29.47, 77.7],
  roorkee: [29.87, 77.89], haldwani: [29.22, 79.52], rishikesh: [30.09, 78.27], almora: [29.6, 79.66],
  nainital: [29.38, 79.46], pithoragarh: [29.58, 80.21], mandi: [31.71, 76.93], solan: [30.9, 77.1],
  kullu: [31.96, 77.11], dharamshala: [32.22, 76.32], una: [31.47, 76.27], hamirpur: [31.69, 76.52],
  pathankot: [32.27, 75.65], hoshiarpur: [31.53, 75.91], moga: [30.82, 75.17], firozpur: [30.93, 74.61],
  sangrur: [30.25, 75.84], barnala: [30.37, 75.55], mohali: [30.7, 76.72], ropar: [30.97, 76.53],
  bhuj: [23.25, 69.67], porbandar: [21.64, 69.61], bhavnagar: [21.76, 72.15], navsari: [20.95, 72.93],
  valsad: [20.61, 72.93], bharuch: [21.7, 72.99], godhra: [22.78, 73.61], palanpur: [24.17, 72.43],
  patan: [23.85, 72.13], himmatnagar: [23.6, 72.97], amreli: [21.6, 71.22], botad: [22.17, 71.67],
  dahod: [22.84, 74.25], vapi: [20.37, 72.9], ankleshwar: [21.63, 73.0], mahesana: [23.6, 72.38],
  chittorgarh: [24.88, 74.63], banswara: [23.55, 74.44], dungarpur: [23.84, 73.72], barmer: [25.75, 71.39],
  jaisalmer: [26.92, 70.91], nagaur: [27.2, 73.73], churu: [28.3, 74.97], jhunjhunu: [28.13, 75.4],
  tonk: [26.17, 75.79], bundi: [25.44, 75.64], baran: [25.1, 76.51], jhalawar: [24.6, 76.16],
  sawai: [26.02, 76.35], dausa: [26.89, 76.34], karauli: [26.5, 77.03], dholpur: [26.7, 77.89],
  hanumangarh: [29.58, 74.33], bhilwara2: [25.35, 74.64], rajsamand: [25.07, 73.88], sirohi: [24.89, 72.86],
  jalore: [25.35, 72.62], mandsaur: [24.07, 75.07], neemuch: [24.47, 74.87], shajapur: [23.43, 76.27],
  vidisha: [23.53, 77.81], sehore: [23.2, 77.08], hoshangabad: [22.75, 77.72], betul: [21.9, 77.9],
  chhindwara: [22.06, 78.94], seoni: [22.09, 79.54], balaghat: [21.81, 80.18], mandla: [22.6, 80.37],
  damoh: [23.83, 79.44], chhatarpur: [24.92, 79.59], tikamgarh: [24.74, 78.83], panna: [24.72, 80.19],
  sidhi: [24.4, 81.88], shahdol: [23.3, 81.36], umaria: [23.52, 80.84], katni: [23.83, 80.39],
  narsinghpur: [22.95, 79.19], dhar: [22.6, 75.3], jhabua: [22.77, 74.59], khargone: [21.82, 75.61],
  barwani: [22.03, 74.9], chandausi: [28.45, 78.78], budaun: [28.04, 79.12], pilibhit: [28.63, 79.8],
  lakhimpur: [27.95, 80.78], sitapur: [27.57, 80.68], hardoi: [27.4, 80.13], barabanki: [26.93, 81.19],
  faizabad: [26.77, 82.15], ayodhya: [26.8, 82.2], gonda: [27.13, 81.96], basti: [26.8, 82.73],
  deoria: [26.5, 83.78], azamgarh: [26.07, 83.18], ballia: [25.76, 84.15], ghazipur: [25.58, 83.58],
  chandauli: [25.26, 83.27], sonbhadra: [24.69, 83.07], banda: [25.48, 80.34], mahoba: [25.29, 79.87],
  lalitpur: [24.69, 78.41], hathras: [27.6, 78.05], etah: [27.56, 78.66], mainpuri: [27.23, 79.03],
  kannauj: [27.06, 79.92], kasganj: [27.81, 78.65], bijnor: [29.37, 78.14], baghpat: [28.95, 77.22],
  shamli: [29.45, 77.31], iglas: [27.71, 77.94], aligarh2: [27.9, 78.08], malerkotla: [30.53, 75.88],
  nalanda: [25.14, 85.44], nawada: [24.88, 85.54], aurangabad2: [24.75, 84.37], rohtas: [24.95, 84.03],
  bhojpur: [25.56, 84.66], vaishali: [25.69, 85.21], samastipur: [25.86, 85.78], madhubani: [26.35, 86.08],
  sitamarhi: [26.59, 85.49], supaul: [26.12, 86.6], araria: [26.15, 87.52], madhepura: [25.92, 86.79],
  khagaria: [25.5, 86.47], lakhisarai: [25.17, 86.09], sheikhpura: [25.14, 85.85], jamui: [24.92, 86.22],
  banka: [24.88, 86.92], gopalganj: [26.47, 84.44], chhapra: [25.78, 84.75], hazaribagh: [23.99, 85.36],
  giridih: [24.18, 86.3], dumka: [24.27, 87.25], palamu: [24.03, 84.07], daltonganj: [24.03, 84.07],
  ramgarh: [23.63, 85.52], chaibasa: [22.55, 85.8], "bhadrak": [21.06, 86.5], balasore: [21.49, 86.93],
  baripada: [21.93, 86.73], puri: [19.81, 85.83], koraput: [18.81, 82.71], jeypore: [18.86, 82.57],
  jagdalpur: [19.08, 82.03], rajnandgaon: [21.1, 81.03], ambikapur: [23.12, 83.2], raigarh: [21.9, 83.4],
  mahasamund: [21.11, 82.1], dhamtari: [20.71, 81.55], kanker: [20.27, 81.49], nanded2: [19.14, 77.32],
  beed: [18.99, 75.76], osmanabad: [18.19, 76.04], hingoli: [19.72, 77.15], buldhana: [20.53, 76.18],
  washim: [20.11, 77.13], yavatmal: [20.39, 78.13], wardha: [20.75, 78.6], gondia: [21.46, 80.19],
  bhandara: [21.17, 79.65], gadchiroli: [20.18, 80.0], ratnagiri: [16.99, 73.3], sindhudurg: [16.0, 73.5],
  raigad: [18.52, 73.18], thane: [19.22, 72.98], "navi mumbai": [19.03, 73.03], kalyan: [19.24, 73.13],
  dombivli: [19.22, 73.09], vasai: [19.39, 72.83], virar: [19.46, 72.8], palghar: [19.7, 72.77],
  sangli: [16.85, 74.58], jalgaon: [21.0, 75.57], nandurbar: [21.37, 74.24], ahmadnagar: [19.09, 74.74],
  alibag: [18.64, 72.87], lonavala: [18.75, 73.41], shirdi: [19.77, 74.48], pandharpur: [17.68, 75.33],
  tuljapur: [18.01, 76.07], akluj: [17.88, 75.02], baramati: [18.15, 74.58], nizamabad2: [18.67, 78.1],
  adilabad: [19.67, 78.53], medak: [18.05, 78.26], nalgonda: [17.06, 79.27], mahbubnagar: [16.74, 77.99],
  siddipet: [18.1, 78.85], sangareddy: [17.62, 78.08], vikarabad: [17.34, 77.9], jagtial: [18.79, 78.91],
  mancherial: [18.87, 79.46], kothagudem: [17.55, 80.62], bhadrachalam: [17.67, 80.89], anakapalle: [17.69, 83.0],
  rajahmundry: [17.0, 81.78], amalapuram: [16.58, 82.0], chirala: [15.82, 80.35], tirupathi: [13.63, 79.42],
  chittoor2: [13.22, 79.1], kuppam: [12.75, 78.34], puttaparthi: [14.17, 77.81], hospete: [15.27, 76.39],
  gadag: [15.43, 75.63], haveri: [14.8, 75.4], karwar: [14.81, 74.13], sirsi: [14.62, 74.84],
  chikmagalur: [13.32, 75.77], hassan: [13.0, 76.1], mandya: [12.52, 76.9], chamarajanagar: [11.93, 76.94],
  kolar: [13.14, 78.13], chikkaballapur: [13.44, 77.73], ramanagara: [12.72, 77.28], bagalkot: [16.18, 75.7],
  vijayapura: [16.83, 75.71], koppal: [15.35, 76.15], yadgir: [16.77, 77.14], kalaburagi: [17.33, 76.83],
  palakkad: [10.78, 76.65], malappuram: [11.07, 76.07], kannur: [11.87, 75.37], kasaragod: [12.5, 75.0],
  wayanad: [11.69, 76.13], idukki: [9.85, 76.97], pathanamthitta: [9.26, 76.78], ernakulam: [9.98, 76.28],
  tirupur: [11.11, 77.34], namakkal: [11.22, 78.17], karur: [10.96, 78.08], pudukkottai: [10.38, 78.82],
  sivaganga: [9.85, 78.48], ramanathapuram: [9.37, 78.83], virudhunagar: [9.58, 77.96], theni: [10.01, 77.48],
  cuddalore: [11.75, 79.77], villupuram: [11.94, 79.49], tiruvannamalai: [12.23, 79.07], kanchipuram: [12.83, 79.7],
  tiruvallur: [13.14, 79.91], krishnagiri: [12.52, 78.21], dharmapuri: [12.13, 78.16], hosur: [12.74, 77.83],
  ariyalur: [11.14, 79.08], perambalur: [11.23, 78.88], nagapattinam: [10.77, 79.84], mayiladuthurai: [11.1, 79.65],
  tiruvarur: [10.77, 79.64], kanyakumari: [8.08, 77.54], ooty: [11.41, 76.7], nilgiris: [11.41, 76.7],
  silchar: [24.83, 92.78], dibrugarh: [27.48, 94.91], jorhat: [26.75, 94.22], nagaon: [26.35, 92.68],
  tinsukia: [27.49, 95.36], bongaigaon: [26.48, 90.56], dhubri: [26.02, 89.98], cooch: [26.32, 89.45],
  jalpaiguri: [26.52, 88.72], darjeeling: [27.04, 88.26], alipurduar: [26.49, 89.53], krishnanagar: [23.4, 88.5],
  bankura: [23.23, 87.07], purulia: [23.33, 86.36], midnapore: [22.42, 87.32], tamluk: [22.3, 87.92],
  contai: [21.78, 87.75], diamond: [22.19, 88.19], basirhat: [22.66, 88.87], bongaon: [23.07, 88.83],
  ranaghat: [23.18, 88.57], kalyani: [22.98, 88.43], chinsurah: [22.9, 88.39], arambagh: [22.88, 87.78],
  leh: [34.16, 77.58], kargil: [34.56, 76.13], udhampur: [32.93, 75.14], kathua: [32.37, 75.52],
  anantnag: [33.73, 75.15], baramulla: [34.2, 74.35], rajouri: [33.38, 74.31], poonch: [33.77, 74.09],
  port: [11.67, 92.75], "port blair": [11.67, 92.75], kavaratti: [10.57, 72.64], daman: [20.4, 72.83],
  silvassa: [20.27, 73.02], diu: [20.71, 70.98],
};

const STATE_CENTROIDS: Record<string, [number, number]> = {
  "uttar pradesh": [26.85, 80.95], up: [26.85, 80.95], bihar: [25.59, 85.14], rajasthan: [26.91, 75.79],
  "madhya pradesh": [23.26, 77.41], mp: [23.26, 77.41], maharashtra: [19.08, 72.88], gujarat: [23.02, 72.57],
  punjab: [30.9, 75.86], haryana: [29.06, 76.09], delhi: [28.61, 77.21], uttarakhand: [30.32, 78.03],
  "himachal pradesh": [31.1, 77.17], jharkhand: [23.34, 85.31], odisha: [20.3, 85.82], orissa: [20.3, 85.82],
  "west bengal": [22.57, 88.36], bengal: [22.57, 88.36], chhattisgarh: [21.25, 81.63], telangana: [17.39, 78.49],
  "andhra pradesh": [16.51, 80.65], karnataka: [12.97, 77.59], "tamil nadu": [13.08, 80.27], tamilnadu: [13.08, 80.27],
  kerala: [9.93, 76.27], assam: [26.14, 91.74], goa: [15.49, 73.83], "jammu and kashmir": [34.08, 74.8],
  kashmir: [34.08, 74.8], nepal: [27.7, 85.32], india: [23.0, 78.0],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zऀ-ॿ\s,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Returns best-guess coordinates and whether the match was a real city (vs a state/centroid fallback). */
export function geocodeIndianPlace(input: string): GeoPoint & { precise: boolean } {
  const norm = normalize(input);
  const tokens = norm.split(/[\s,]+/).filter(Boolean);

  // Full phrase, then every comma part, then individual tokens and bigrams.
  const candidates: string[] = [norm, ...norm.split(",").map((p) => p.trim())];
  for (let i = 0; i < tokens.length; i++) {
    candidates.push(tokens[i]);
    if (i + 1 < tokens.length) candidates.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  for (const c of candidates) {
    const hit = CITIES[c];
    if (hit) return { lat: hit[0], lon: hit[1], label: c, precise: true };
  }
  // Prefix match on city keys (e.g. "jaipur city", "lucknow cantt")
  for (const c of candidates) {
    if (c.length < 4) continue;
    const key = Object.keys(CITIES).find((k) => k.startsWith(c) || c.startsWith(k));
    if (key) {
      const hit = CITIES[key];
      return { lat: hit[0], lon: hit[1], label: key, precise: true };
    }
  }
  for (const c of candidates) {
    const hit = STATE_CENTROIDS[c];
    if (hit) return { lat: hit[0], lon: hit[1], label: c, precise: false };
  }
  return { lat: 23.0, lon: 78.0, label: "india", precise: false };
}

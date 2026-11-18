require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const users = [
  {
    "name": "المدير",
    "number": 1974,
    "role": "admin",
    "company": "Main",
    "branch": "Main"
  },
  {
    "name": "ناجي القاسم",
    "number": 2004,
    "role": "approver",
    "company": "Main",
    "branch": "Main"
  },
  {
    "name": "محمد شلتوت",
    "number": 1992,
    "role": "price_editor",
    "company": "Main",
    "branch": "Main"
  },
  {
    "name": "Aswaaq Al Mizhar",
    "number": 201,
    "role": "requester",
    "company": "UAE",
    "branch": "Aswaaq Al Mizhar"
  },
  {
    "name": "BIN SOUQAT BR",
    "number": 202,
    "role": "requester",
    "company": "UAE",
    "branch": "BIN SOUQAT BR"
  },
  {
    "name": "ETIHAD Mall BR",
    "number": 203,
    "role": "requester",
    "company": "UAE",
    "branch": "ETIHAD Mall BR"
  },
  {
    "name": "Al Barsha Mall BR",
    "number": 204,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Barsha Mall BR"
  },
  {
    "name": "Dubai Mall BR",
    "number": 205,
    "role": "requester",
    "company": "UAE",
    "branch": "Dubai Mall BR"
  },
  {
    "name": "Al Warqaa Mall Br",
    "number": 206,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Warqaa Mall Br"
  },
  {
    "name": "NAEEM CITY CENTER",
    "number": 207,
    "role": "requester",
    "company": "UAE",
    "branch": "NAEEM CITY CENTER"
  },
  {
    "name": "RAS ALKHIMA BR",
    "number": 208,
    "role": "requester",
    "company": "UAE",
    "branch": "RAS ALKHIMA BR"
  },
  {
    "name": "City Centre Al Dhait BR",
    "number": 209,
    "role": "requester",
    "company": "UAE",
    "branch": "City Centre Al Dhait BR"
  },
  {
    "name": "Al Mairid BR",
    "number": 210,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Mairid BR"
  },
  {
    "name": "Kalba BR",
    "number": 211,
    "role": "requester",
    "company": "UAE",
    "branch": "Kalba BR"
  },
  {
    "name": "KHOREFKAN BR",
    "number": 212,
    "role": "requester",
    "company": "UAE",
    "branch": "KHOREFKAN BR"
  },
  {
    "name": "Matajer AlJuraina BR",
    "number": 213,
    "role": "requester",
    "company": "UAE",
    "branch": "Matajer AlJuraina BR"
  },
  {
    "name": "Al Dhaid BR",
    "number": 214,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Dhaid BR"
  },
  {
    "name": "Al Rahmaniya BR",
    "number": 215,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Rahmaniya BR"
  },
  {
    "name": "City Center Al Zahia BR",
    "number": 216,
    "role": "requester",
    "company": "UAE",
    "branch": "City Center Al Zahia BR"
  },
  {
    "name": "Al Souiah Mall BR",
    "number": 217,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Souiah Mall BR"
  },
  {
    "name": "AJMAN INDUSTRIAL AREA BR",
    "number": 218,
    "role": "requester",
    "company": "UAE",
    "branch": "AJMAN INDUSTRIAL AREA BR"
  },
  {
    "name": "AJMAN CHINA MALL BR",
    "number": 219,
    "role": "requester",
    "company": "UAE",
    "branch": "AJMAN CHINA MALL BR"
  },
  {
    "name": "City Centre Ajman",
    "number": 220,
    "role": "requester",
    "company": "UAE",
    "branch": "City Centre Ajman"
  },
  {
    "name": "MADINAT ZAYED BR",
    "number": 221,
    "role": "requester",
    "company": "UAE",
    "branch": "MADINAT ZAYED BR"
  },
  {
    "name": "Deerfields Mall Br",
    "number": 222,
    "role": "requester",
    "company": "UAE",
    "branch": "Deerfields Mall Br"
  },
  {
    "name": "Dalma Mall Br",
    "number": 223,
    "role": "requester",
    "company": "UAE",
    "branch": "Dalma Mall Br"
  },
  {
    "name": "Al Dhafra Mall",
    "number": 224,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Dhafra Mall"
  },
  {
    "name": "Reem Mall",
    "number": 225,
    "role": "requester",
    "company": "UAE",
    "branch": "Reem Mall"
  },
  {
    "name": "Al Foah Mall",
    "number": 226,
    "role": "requester",
    "company": "UAE",
    "branch": "Al Foah Mall"
  },
  {
    "name": "Bawadi Mall",
    "number": 227,
    "role": "requester",
    "company": "UAE",
    "branch": "Bawadi Mall"
  },
  {
    "name": "Alyaher Br2",
    "number": 228,
    "role": "requester",
    "company": "UAE",
    "branch": "Alyaher Br2"
  },
  {
    "name": "Central market Al Ain",
    "number": 229,
    "role": "requester",
    "company": "UAE",
    "branch": "Central market Al Ain"
  },
  {
    "name": " Al fujairah",
    "number": 230,
    "role": "requester",
    "company": "UAE",
    "branch": " Al fujairah"
  },
  {
    "name": "Dibba Al fujairah",
    "number": 231,
    "role": "requester",
    "company": "UAE",
    "branch": "Dibba Al fujairah"
  },
  {
    "name": "Om Alqeween BR",
    "number": 232,
    "role": "requester",
    "company": "UAE",
    "branch": "Om Alqeween BR"
  },
  {
    "name": "My City Centre Masdar",
    "number": 233,
    "role": "requester",
    "company": "UAE",
    "branch": "My City Centre Masdar"
  },
  {
    "name": "Bawabat Al Sharq Mall",
    "number": 234,
    "role": "requester",
    "company": "UAE",
    "branch": "Bawabat Al Sharq Mall"
  },
  {
    "name": "Golden Dragon Mall (Br1)",
    "number": 301,
    "role": "requester",
    "company": "OMAN",
    "branch": "Golden Dragon Mall (Br1)"
  },
  {
    "name": "Alsalm St  BR",
    "number": 302,
    "role": "requester",
    "company": "OMAN",
    "branch": "Alsalm St  BR"
  },
  {
    "name": "Al saada BR",
    "number": 303,
    "role": "requester",
    "company": "OMAN",
    "branch": "Al saada BR"
  },
  {
    "name": "Golden Dragon Mall (Br2)",
    "number": 304,
    "role": "requester",
    "company": "OMAN",
    "branch": "Golden Dragon Mall (Br2)"
  },
  {
    "name": "Sur (Br1)",
    "number": 305,
    "role": "requester",
    "company": "OMAN",
    "branch": "Sur (Br1)"
  },
  {
    "name": "Souhar (Br1)",
    "number": 306,
    "role": "requester",
    "company": "OMAN",
    "branch": "Souhar (Br1)"
  },
  {
    "name": "Souhar (Br2)",
    "number": 307,
    "role": "requester",
    "company": "OMAN",
    "branch": "Souhar (Br2)"
  },
  {
    "name": "Elheil (Br1)",
    "number": 308,
    "role": "requester",
    "company": "OMAN",
    "branch": "Elheil (Br1)"
  },
  {
    "name": "WEB SITE",
    "number": 309,
    "role": "requester",
    "company": "OMAN",
    "branch": "WEB SITE"
  },
  {
    "name": "AL SEEB (Br2)",
    "number": 310,
    "role": "requester",
    "company": "OMAN",
    "branch": "AL SEEB (Br2)"
  },
  {
    "name": "Nazwa",
    "number": 311,
    "role": "requester",
    "company": "OMAN",
    "branch": "Nazwa"
  },
  {
    "name": "Alkhawd",
    "number": 312,
    "role": "requester",
    "company": "OMAN",
    "branch": "Alkhawd"
  },
  {
    "name": "Elheil (Br2)",
    "number": 313,
    "role": "requester",
    "company": "OMAN",
    "branch": "Elheil (Br2)"
  },
  {
    "name": "Muscat Mall",
    "number": 314,
    "role": "requester",
    "company": "OMAN",
    "branch": "Muscat Mall"
  },
  {
    "name": "Al SEEB (Br3)",
    "number": 315,
    "role": "requester",
    "company": "OMAN",
    "branch": "Al SEEB (Br3)"
  },
  {
    "name": "Avenues Mall",
    "number": 316,
    "role": "requester",
    "company": "OMAN",
    "branch": "Avenues Mall"
  },
  {
    "name": "Al amerat",
    "number": 317,
    "role": "requester",
    "company": "OMAN",
    "branch": "Al amerat"
  },
  {
    "name": "City Centre Suhar",
    "number": 318,
    "role": "requester",
    "company": "OMAN",
    "branch": "City Centre Suhar"
  },
  {
    "name": "Mall of oman",
    "number": 319,
    "role": "requester",
    "company": "OMAN",
    "branch": "Mall of oman"
  },
  {
    "name": "Golden Dragon Mall (Br3)",
    "number": 320,
    "role": "requester",
    "company": "OMAN",
    "branch": "Golden Dragon Mall (Br3)"
  },
  {
    "name": "City Centre Qurum",
    "number": 321,
    "role": "requester",
    "company": "OMAN",
    "branch": "City Centre Qurum"
  },
  {
    "name": "City Center Al Mawaleh",
    "number": 322,
    "role": "requester",
    "company": "OMAN",
    "branch": "City Center Al Mawaleh"
  },
  {
    "name": "Sur City Center (Mirano)",
    "number": 323,
    "role": "requester",
    "company": "OMAN",
    "branch": "Sur City Center (Mirano)"
  },
  {
    "name": "Mall of oman (MIRANO)",
    "number": 324,
    "role": "requester",
    "company": "OMAN",
    "branch": "Mall of oman (MIRANO)"
  },
  {
    "name": "GRAND MALL SALALAH",
    "number": 325,
    "role": "requester",
    "company": "OMAN",
    "branch": "GRAND MALL SALALAH"
  },
  {
    "name": "IBRI BR",
    "number": 326,
    "role": "requester",
    "company": "OMAN",
    "branch": "IBRI BR"
  },
  {
    "name": "Al-Musannah State BR",
    "number": 327,
    "role": "requester",
    "company": "OMAN",
    "branch": "Al-Musannah State BR"
  },
  {
    "name": "AL SEEB (Br1)",
    "number": 328,
    "role": "requester",
    "company": "OMAN",
    "branch": "AL SEEB (Br1)"
  },
  {
    "name": "Dragon (BR1)",
    "number": 401,
    "role": "requester",
    "company": "BHR",
    "branch": "Dragon (BR1)"
  },
  {
    "name": "Ged Ali (BR1)",
    "number": 402,
    "role": "requester",
    "company": "BHR",
    "branch": "Ged Ali (BR1)"
  },
  {
    "name": "Budaiya (BR1)",
    "number": 403,
    "role": "requester",
    "company": "BHR",
    "branch": "Budaiya (BR1)"
  },
  {
    "name": "Al refaa (BR1)",
    "number": 404,
    "role": "requester",
    "company": "BHR",
    "branch": "Al refaa (BR1)"
  },
  {
    "name": "Dragon (BR3)",
    "number": 405,
    "role": "requester",
    "company": "BHR",
    "branch": "Dragon (BR3)"
  },
  {
    "name": "Ramli Mall (BR1)",
    "number": 406,
    "role": "requester",
    "company": "BHR",
    "branch": "Ramli Mall (BR1)"
  },
  {
    "name": "The Gate Mall",
    "number": 407,
    "role": "requester",
    "company": "BHR",
    "branch": "The Gate Mall"
  },
  {
    "name": "Aljahra",
    "number": 408,
    "role": "requester",
    "company": "BHR",
    "branch": "Aljahra"
  },
  {
    "name": "Makkah Mall BR",
    "number": 501,
    "role": "requester",
    "company": "KSA",
    "branch": "Makkah Mall BR"
  },
  {
    "name": "Al Jouri Mall BR",
    "number": 502,
    "role": "requester",
    "company": "KSA",
    "branch": "Al Jouri Mall BR"
  },
  {
    "name": "Tabuk Park BR",
    "number": 503,
    "role": "requester",
    "company": "KSA",
    "branch": "Tabuk Park BR"
  },
  {
    "name": "Al Noor Mall BR",
    "number": 504,
    "role": "requester",
    "company": "KSA",
    "branch": "Al Noor Mall BR"
  },
  {
    "name": "Yasmin Mall BR",
    "number": 505,
    "role": "requester",
    "company": "KSA",
    "branch": "Yasmin Mall BR"
  },
  {
    "name": "The Village Mall BR",
    "number": 506,
    "role": "requester",
    "company": "KSA",
    "branch": "The Village Mall BR"
  },
  {
    "name": "Al Qasr Mall BR",
    "number": 507,
    "role": "requester",
    "company": "KSA",
    "branch": "Al Qasr Mall BR"
  },
  {
    "name": "U Walk BR",
    "number": 508,
    "role": "requester",
    "company": "KSA",
    "branch": "U Walk BR"
  },
  {
    "name": "Al Andalus Mall BR",
    "number": 509,
    "role": "requester",
    "company": "KSA",
    "branch": "Al Andalus Mall BR"
  },
  {
    "name": "Mlimani City Mall",
    "number": 601,
    "role": "requester",
    "company": "TNZ",
    "branch": "Mlimani City Mall"
  },
  {
    "name": "Kunduchi mall",
    "number": 602,
    "role": "requester",
    "company": "TNZ",
    "branch": "Kunduchi mall"
  },
  {
    "name": "Dar village mall",
    "number": 603,
    "role": "requester",
    "company": "TNZ",
    "branch": "Dar village mall"
  },
  {
    "name": "Aura mall",
    "number": 604,
    "role": "requester",
    "company": "TNZ",
    "branch": "Aura mall"
  },
  {
    "name": "Palm Village",
    "number": 605,
    "role": "requester",
    "company": "TNZ",
    "branch": "Palm Village"
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const u of users) {
    const exists = await User.findOne({ number: u.number });
    if (exists) {
      console.log(`تخطي: الرقم ${u.number} موجود مسبقًا`);
      continue;
    }
    await User.create(u);
    console.log(`تمت إضافة: ${u.name} (${u.number})`);
  }

  await mongoose.disconnect();
}

seed();
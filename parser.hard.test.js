const assert = require("assert");
const { parseInteraction } = require("./parser");

const cases = [
  {
    name: "missing id maintenance lowercase",
    text: `name: mia thomas
fleming hall flat 12 room 4

socket by bed not working and bathroom light flickers`,
    expected: { studentNumber: "", fullName: "Mia Thomas", lastName: "Thomas", hall: "Fleming", flat: "12", room: "4", enquiryType: "Maintenance" }
  },
  {
    name: "surname first explicit",
    text: `Surname: Ndlovu
First name: Thandi
SID: 2345678
Chepstow Hall Flat 12/Room 4

Radiator cold and heating not working.`,
    expected: { fullName: "Thandi Ndlovu", lastName: "Ndlovu", studentNumber: "2345678", hall: "Chepstow Hall", flat: "12", room: "4", enquiryType: "Maintenance" }
  },
  {
    name: "dot room format",
    text: `ID 2456789
Ben Carter
Mill Hall 12.4
shower leaking and toilet blocked`,
    expected: { fullName: "Ben Carter", hall: "Mill", flat: "12", room: "4", enquiryType: "Maintenance" }
  },
  {
    name: "multiple amounts appeal charge",
    text: `Student no 2223334
Name: Eva Moore
Fleming Hall room 210

I paid £20 already but want to appeal a damage charge of £180 on my account.`,
    expected: { caseType: "Appeal", chargeAmount: "180", appealType: "Damage", hall: "Fleming", room: "210" }
  },
  {
    name: "brunel assist and email",
    text: `ID: 2445566
Noah Brooks
Bishop Hall flat 6 room 2

Student emailed after raising on Brunel Assist ref BA-998877.
Bedroom window handle broken.`,
    expected: { contactMethod: "Brunel Assist", apexRef: "BA-998877", enquiryType: "Maintenance", hall: "Bishops Hall", flat: "6", room: "2" }
  },
  {
    name: "typo maintenance",
    text: `ID 2556677
Amira Shah
Chepstow hall room 119

the showr is leeking and plug soket doesnt work`,
    expected: { enquiryType: "Maintenance", hall: "Chepstow Hall", room: "119", lastName: "Shah" }
  },
  {
    name: "typo contract",
    text: `Student Number 2667788
Leo Martin
Mill Hall room 501

contrct question abt rent instalment date pls`,
    expected: { enquiryType: "Contract Query", hall: "Mill", room: "501", lastName: "Martin" }
  },
  {
    name: "flat slash room words",
    text: `Student ID: 2778899
Name: Grace Lee
Hall Fleming
Flat 12/Room 4

flatmate keeps taking food and shouting`,
    expected: { enquiryType: "Flat Disputes", hall: "Fleming", flat: "12", room: "4", lastName: "Lee" }
  },
  {
    name: "conduct incident",
    text: `ID 2889900
Omar Hassan
Mill Hall flat 8 room 1

Security incident report, student needs to give a statement for conduct meeting.`,
    expected: { caseType: "Conduct", hall: "Mill", flat: "8", room: "1", lastName: "Hassan" }
  },
  {
    name: "moving out not maintenance",
    text: `ID 2990011
Name: Isla Walker
Chepstow Hall room 304

I am moving out next week and need to know checkout process and where to return keys.`,
    expected: { enquiryType: "Moving Out", hall: "Chepstow Hall", room: "304", lastName: "Walker" }
  },
  {
    name: "cancellation vacating",
    text: `Student Number: 2111222
Name: Nina Park
Galbraith Hall room 214

I need to cancel my accommodation booking and vacate the room next month.`,
    expected: { enquiryType: "Cancellation or Vacating", hall: "Galbraith", room: "214", lastName: "Park" }
  },
  {
    name: "application room offer",
    text: `ID 2111333
Name: Peter Stone

I have an application query about my room offer and allocation on the portal.`,
    expected: { enquiryType: "Application Query", lastName: "Stone" }
  },
  {
    name: "moving in key collection",
    text: `Student ID 2111444
Name: Maria Lopez
Faraday 3 room 102

I am arriving tomorrow and need to collect my key for moving in.`,
    expected: { enquiryType: "Moving In", hall: "Faraday 3", room: "102", lastName: "Lopez" }
  },
  {
    name: "formal complaint",
    text: `ID 2111555
Name: Aaron White
Southwark Hall flat 4 room 2

I want to make a formal complaint because my previous reports have not been resolved.`,
    expected: { caseType: "Complaint", hall: "Southwark Hall", flat: "4", room: "2", lastName: "White" }
  },
  {
    name: "health and safety charge",
    text: `Student no 2111666
Name: Laila Brooks
Bishops Hall flat 3 room 1

I received a health and safety charge of £25 for blocking the fire door.`,
    expected: { caseType: "Charge", chargeType: "Health & Safety", chargeAmount: "25", hall: "Bishops Hall", flat: "3", room: "1", lastName: "Brooks" }
  }
];

let failed = 0;
for (const item of cases) {
  const parsed = parseInteraction(item.text);
  try {
    for (const [key, value] of Object.entries(item.expected)) {
      assert.strictEqual(parsed[key], value, `${item.name}: ${key}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
    console.error(parsed);
  }
}

const passed = cases.length - failed;
console.log(`${passed}/${cases.length} hard parser cases passed.`);
if (failed) process.exit(1);

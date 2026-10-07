const assert = require("assert");
const { parseInteraction, splitApexQueue } = require("./parser");

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

const apexQueue = `219389\tPRE ALARM ACTIVATION - CAMPUS / HALLS\t05-Oct-2026\t20:07\tTyrrell reported a pre-alarm activation at the above location.\t2026/7\tGEORGE SHIPP HALL\t05-Oct-2026\tSecurity to location. Cause: Someone was cooking food and left the kitchen door open. No perpetrator found. Security reset the panel. Student Living Noted. Email reminder was sent to the flat. Thank you Security (SJ) 06/10/2026
\`\`\`vbnet
123456\tHALLS MAINTENANCE ISSUES\t05-Oct-2026\t20:13\tMiss STUDENT called the security office to report that the oven is not working in her kitchen.\t2026/7\tCONCOURSE\t05-Oct-2026\tSecurity to the location and checked all the trip switches. They were all fine, but the oven was still not working. Security contacted Maintenance for assistance, but they advised that the student must report the issue to Student Living. Student Living Noted. Brunel Assist / Maintenance Request was raised(#REQ-616822). Thank you Security (SJ) 06/10/2026.

789012\tHALLS MAINTENANCE ISSUES\t05-Oct-2026\t18:55\tMiss STUDENT2 called the security office and reported that room sockets were not working,\t2026/7\tRUNNYMEDE HALL\t05-Oct-2026\tSecurity to location, trip switch reset and power is back to normal. Student Living Noted. NFA. Thank you Security (SJ) 06/10/2026
\`\`\``;

const apexRows = splitApexQueue(apexQueue);
assert.strictEqual(apexRows.length, 3, "apex queue should split into three rows");
assert.deepStrictEqual(
  apexRows.map((row) => {
    const parsed = parseInteraction(row);
    return {
      apexRef: parsed.apexRef,
      contactMethod: parsed.contactMethod,
      hall: parsed.hall,
      caseType: parsed.caseType,
      enquiryType: parsed.enquiryType
    };
  }),
  [
    { apexRef: "219389", contactMethod: "Apex", hall: "George Shipp Hall", caseType: "Enquiry", enquiryType: "Maintenance" },
    { apexRef: "123456", contactMethod: "Apex", hall: "Concourse Hall", caseType: "Enquiry", enquiryType: "Maintenance" },
    { apexRef: "789012", contactMethod: "Apex", hall: "Runnymede Hall", caseType: "Enquiry", enquiryType: "Maintenance" }
  ],
  "apex queue rows should parse as Apex maintenance enquiries"
);

const wrappedApexQueue = apexQueue.replace(/\n+/g, " ");
const wrappedApexRows = splitApexQueue(wrappedApexQueue);
assert.strictEqual(wrappedApexRows.length, 3, "wrapped apex queue should still split into three rows");
assert.deepStrictEqual(
  wrappedApexRows.map((row) => parseInteraction(row).apexRef),
  ["219389", "123456", "789012"],
  "wrapped apex queue should preserve Apex refs"
);

const lockoutApex = "456789\tLOCKOUT - HALLS\t05-Oct-2026\t22:14\tStudent ID 2211223 called Security because they left keys inside room 304.\t2026/7\tGEORGE SHIPP HALL\t05-Oct-2026\tSecurity attended location and gave access to the student. Student Living Noted.";
const parsedLockout = parseInteraction(lockoutApex);
assert.strictEqual(parsedLockout.apexRef, "456789", "lockout apex ref");
assert.strictEqual(parsedLockout.studentNumber, "2211223", "lockout student id");
assert.strictEqual(parsedLockout.roomNumber, "304", "lockout room number");
assert.strictEqual(parsedLockout.lockoutDate, "2026-10-05", "lockout date");
assert.strictEqual(parsedLockout.lockoutTime, "22:14", "lockout time");
assert.strictEqual(parsedLockout.lockoutAssistanceDetails, "Security", "lockout assistance");
assert(parsedLockout.lockoutDescription.toLowerCase().includes("left keys inside"), "lockout description");

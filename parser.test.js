const assert = require("assert");
const { parseInteraction } = require("./parser");

const cases = [
  {
    name: "maintenance moved in email",
    text: `ID: 2132131
Room: Mill Hall 757

Ive just moved in, 2 days ago, and im still settling in. I wasnt sure who best to email, however, I've come across the following problems:
The toilet roll holder is not screwed in, I think it is missing a screw so it just fell off when I touched it.`,
    expected: { studentNumber: "2132131", enquiryType: "Maintenance", contactMethod: "Email", hall: "Mill", room: "757" }
  },
  {
    name: "maintenance leak",
    text: `Student Number: 2245678
Name: Sarah Ahmed
Hall: Fleming Hall
Flat: 23
Room: 4

There is water leaking underneath my bathroom sink. It started yesterday evening and the floor keeps getting wet.
Can someone please come and have a look?`,
    expected: { enquiryType: "Maintenance", contactMethod: "Live chat", hall: "Fleming", flat: "23", room: "4", lastName: "Ahmed" }
  },
  {
    name: "lock out",
    text: `2234512
James Wilson
Bishop Hall flat 18 room 3

locked out of my room
left my key inside when I went to the kitchen
can security let me back in please`,
    expected: { enquiryType: "Lock out", hall: "Bishops Hall", flat: "18", room: "3", lastName: "Wilson" }
  },
  {
    name: "lost key phone",
    text: `Student ID 2198765
Full name: Mohammed Ali
Isambard Complex
Room 412

I lost my room key somewhere on campus today.
I have checked my bag and retraced my steps but cant find it.
Called by phone to ask what I need to do.`,
    expected: { enquiryType: "Lock out", contactMethod: "Phone", room: "412", lastName: "Ali" }
  },
  {
    name: "salto",
    text: `ID - 2312345
Anna Kowalski
Hall: Chepstow Hall
Flat 7 Room 2

My Salto card isn't opening the main flat door.
It works for my bedroom but not for the flat entrance.`,
    expected: { enquiryType: "Lock out", hall: "Chepstow Hall", flat: "7", room: "2", lastName: "Kowalski" }
  },
  {
    name: "flat dispute noise",
    text: `Student no: 2267890
Name: Chloe Brown
Mill Hall
Flat 42 Room 6

One of my flatmates keeps playing loud music after midnight.
We have asked him several times to turn it down but it keeps happening.
I want to know who I should speak to about the noise.`,
    expected: { enquiryType: "Flat Disputes", hall: "Mill", flat: "42", room: "6", lastName: "Brown" }
  },
  {
    name: "flat dispute compact",
    text: `2299887
Daniel Smith
Fleming Hall 15/5

Having problems with my flatmate.
They keep taking my food from the shared kitchen and we had an argument yesterday.
I don't feel comfortable confronting them again.`,
    expected: { enquiryType: "Flat Disputes", hall: "Fleming", flat: "15", room: "5", lastName: "Smith" }
  },
  {
    name: "room change",
    text: `ID: 2211456
Emily Jones
Bishop Hall
Flat 31
Room 2

I would like to request a room change.
There is constant noise in my current flat and I am struggling to sleep.
Can I transfer to another hall if there are rooms available?`,
    expected: { enquiryType: "Room Change", hall: "Bishops Hall", flat: "31", room: "2", lastName: "Jones" }
  },
  {
    name: "room swap",
    text: `Student Number 2200456
Ahmed Khan
Chepstow Hall flat 11 room 6

I spoke to another student and we are both interested in swapping rooms.
What is the process for a room swap?`,
    expected: { enquiryType: "Room Change", hall: "Chepstow Hall", flat: "11", room: "6", lastName: "Khan" }
  },
  {
    name: "contract query",
    text: `ID: 2187345
Lucy Taylor
Mill Hall room 522

I have a question about my accommodation contract.
My agreement says my tenancy ends in September but I may need to leave in June.
Will I still have to pay the remaining rent instalments?`,
    expected: { enquiryType: "Contract Query", hall: "Mill", room: "522", lastName: "Taylor" }
  },
  {
    name: "contract phone",
    text: `Student: David Chen
Student No: 2300112
Hall: Fleming Hall
Room: 208

Called by phone regarding the next accommodation rent instalment.
Student wants to know the payment date and whether the instalment can be paid a few days late.`,
    expected: { enquiryType: "Contract Query", contactMethod: "Phone", hall: "Fleming", room: "208", lastName: "Chen" }
  },
  {
    name: "charge damage",
    text: `ID 2177665
Name: Hannah Williams
Bishop Hall Flat 5 Room 3

I have received a £75 charge for damage to the kitchen table.
I wanted to check what the charge is for because I wasn't aware that anything had been damaged.`,
    expected: { caseType: "Charge", chargeAmount: "75", chargeType: "Damage", hall: "Bishops Hall", flat: "5", room: "3", lastName: "Williams" }
  },
  {
    name: "charge invoice",
    text: `Student number: 2255991
Name: Tom Roberts
Mill Hall 414

I received an invoice for £120 for cleaning charges after an inspection.
Could you explain why this has been added to my account?`,
    expected: { caseType: "Charge", chargeAmount: "120", hall: "Mill", room: "414", lastName: "Roberts" }
  },
  {
    name: "appeal fine",
    text: `ID: 2167894
Rebecca Green
Chepstow Hall
Flat 26 Room 1

I want to appeal the £50 fine I received for leaving rubbish in the corridor.
I don't believe the rubbish belonged to me and would like to challenge the charge.`,
    expected: { caseType: "Appeal", chargeAmount: "50", hall: "Chepstow Hall", flat: "26", room: "1", lastName: "Green" }
  },
  {
    name: "appeal damage email",
    text: `Student No 2244110
Michael Johnson
Fleming Hall room 315

I am emailing to dispute a damage charge of £180.
The damage to the wardrobe was already there when I moved into the room.
I reported it during the first week.

Please treat this as an appeal.`,
    expected: { caseType: "Appeal", contactMethod: "Email", chargeAmount: "180", appealType: "Damage", hall: "Fleming", room: "315", lastName: "Johnson" }
  },
  {
    name: "brunel assist",
    text: `ID: 2319988
Sophie Martin
Bishop Hall Flat 17 Room 4

Raised on Brunel Assist.
Ref: BA-458921

The heating in my bedroom isn't working.
Radiator stays cold even when turned all the way up.`,
    expected: { enquiryType: "Maintenance", contactMethod: "Brunel Assist", apexRef: "BA-458921", hall: "Bishops Hall", flat: "17", room: "4", lastName: "Martin" }
  },
  {
    name: "apex in person",
    text: `Student ID: 2288771
Name: Oliver King
Hall: Mill Hall
Room 602

Apex ref: APEX-773291

Student came in person regarding a broken bedroom window handle.
Window will not close properly and cold air is coming into the room.`,
    expected: { enquiryType: "Maintenance", contactMethod: "In-person", apexRef: "APEX-773291", hall: "Mill", room: "602", lastName: "King" }
  },
  {
    name: "mould",
    text: `2300998
Fatima Hassan
Fleming Hall
Flat 9 Room 1

Hi, there is black mould starting to appear around my bedroom window.
I noticed it about a week ago but it has spread quite quickly.
I have been opening the window every morning but it is getting worse.`,
    expected: { enquiryType: "Maintenance", hall: "Fleming", flat: "9", room: "1", lastName: "Hassan" }
  },
  {
    name: "door live chat",
    text: `Student Number: 2208764
Name: Jack Evans
Chepstow Hall room 107

Bedroom door is broken.
The door closes but doesn't latch properly and sometimes opens by itself.

Contacted via live chat.`,
    expected: { enquiryType: "Maintenance", contactMethod: "Live chat", hall: "Chepstow Hall", room: "107", lastName: "Evans" }
  },
  {
    name: "multiple maintenance",
    text: `ID 2321456
Name: Priya Patel
Mill Hall
Flat 36
Room 5

Just moved in yesterday and noticed a few things:

- bathroom light isn't working
- shower is leaking
- bedroom window doesn't close fully
- desk chair has a broken wheel

I wasn't sure if I need to report each problem separately so I'm sending everything together.`,
    expected: { enquiryType: "Maintenance", hall: "Mill", flat: "36", room: "5", lastName: "Patel" },
    issueIncludes: ["bathroom light", "shower is leaking", "bedroom window", "desk chair"]
  }
];

let failed = 0;
for (const item of cases) {
  const parsed = parseInteraction(item.text);
  try {
    for (const [key, value] of Object.entries(item.expected)) {
      assert.strictEqual(parsed[key], value, `${item.name}: ${key}`);
    }
    for (const part of item.issueIncludes || []) {
      assert(parsed.issue.toLowerCase().includes(part), `${item.name}: issue missing ${part}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error.message);
    console.error(parsed);
  }
}

if (failed) {
  console.error(`${failed} parser cases failed.`);
  process.exit(1);
}

console.log(`${cases.length} parser cases passed.`);

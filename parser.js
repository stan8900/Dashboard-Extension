(function attachParser(root) {
  "use strict";

  const HALLS = [
    "Mill",
    "Fleming",
    "Galbraith",
    "Bishops Hall",
    "Lacy Hall",
    "Kilmorey Hall",
    "St Margarets Hall",
    "Chepstow Hall",
    "Clifton Hall",
    "Faraday 1",
    "Faraday 2",
    "Faraday 3",
    "Faraday 4",
    "Faraday 5",
    "Faraday 6",
    "Faraday 7",
    "George Shipp Hall",
    "Concourse Hall",
    "Syd Urry Hall",
    "Shoreditch Hall",
    "Trevor Slater Hall",
    "Meadow Hall",
    "North Hall",
    "West Hall",
    "South Hall",
    "Central Hall",
    "Maurice Kogan Hall",
    "Brian Winstanley Hall",
    "Michael Bevis Hall",
    "Runnymede Hall",
    "East Hall",
    "David Neave Hall",
    "Stephen Bragg Hall",
    "Lancaster Hall",
    "Southwark Hall",
    "Borough Road Hall",
    "Gordon Hall",
    "Stockwell Hall",
    "Maria Grey Hall"
  ];

  const ENQUIRY_TYPES = [
    "Maintenance",
    "Moving In",
    "Moving Out",
    "Cancellation or Vacating",
    "Flat Disputes",
    "Room Change",
    "Application Query",
    "Brunel Student Lettings Enquiry",
    "Room Concerns",
    "Lock out",
    "Contract Query",
    "Course Related"
  ];

  const ISSUE_TO_ENQUIRY_TYPE = [
    [/flat\s+dispute|flatmate|flat\s*mate|housemate|noise|antisocial|anti-social|harass|threat|argument|fight|dispute|neighbour/i, "Flat Disputes"],
    [/maintenance|repair|broken|break|leak|flood|heating|heater|radiator|hot\s+water|cold\s+water|mould|mold|light|electric|power|socket|shower|toilet|bathroom|sink|tap|drain|door|window|lock\s+broken|fault|pest|bug|wifi|internet|oven|fridge|freezer|washing/i, "Maintenance"],
    [/move\s*in|moving\s*in|arrival|arrive|collect.*key|key\s+collection|check\s*in/i, "Moving In"],
    [/move\s*out|moving\s*out|check\s*out|leav(?:e|ing)\s+room|departure/i, "Moving Out"],
    [/cancel|cancellation|vacat|withdraw|terminate|leav(?:e|ing)\s+accommodation|end\s+contract/i, "Cancellation or Vacating"],
    [/room\s+change|change\s+room|transfer|swap|move\s+room/i, "Room Change"],
    [/application|booking|offer|allocation|room\s+offer|apply|portal/i, "Application Query"],
    [/lettings|private\s+rent|landlord|property|brunel\s+student\s+lettings/i, "Brunel Student Lettings Enquiry"],
    [/room\s+concern|bedroom|mattress|furniture|desk|wardrobe|curtain|blind|smell|dirty\s+room/i, "Room Concerns"],
    [/lock\s*out|locked\s+out|lockout|lost\s+key|forgot.*key|key\s+card|salto/i, "Lock out"],
    [/contract|licen[cs]e|tenancy|instalment|rent|payment\s+plan|agreement/i, "Contract Query"],
    [/course|module|lecture|seminar|timetable|academic|student\s+centre/i, "Course Related"]
  ];

  const CASE_TYPE_RULES = [
    [/appeal|appealing|dispute.*charge|challenge.*fine/i, "Appeal"],
    [/charge|charged|fine|invoice|payment|damage\s+cost|lockout\s+fee|lock\s*out\s+fee/i, "Charge"],
    [/conduct|disciplinary|misconduct|incident\s+report|security\s+report|statement|hearing|appointment\s+date/i, "Conduct"],
    [/complaint|formal\s+complaint|unhappy|dissatisfied|escalat/i, "Complaint"]
  ];

  const HALL_ALIASES = [
    [/st\.?\s*marg(?:aret'?s)?/i, "St Margarets Hall"],
    [/bishop'?s/i, "Bishops Hall"],
    [/george\s+shipp/i, "George Shipp Hall"],
    [/syd\s+urry/i, "Syd Urry Hall"],
    [/trevor\s+slater/i, "Trevor Slater Hall"],
    [/maurice\s+kogan/i, "Maurice Kogan Hall"],
    [/brian\s+winstanley/i, "Brian Winstanley Hall"],
    [/michael\s+bevis/i, "Michael Bevis Hall"],
    [/david\s+neave/i, "David Neave Hall"],
    [/stephen\s+bragg/i, "Stephen Bragg Hall"],
    [/borough\s+road/i, "Borough Road Hall"],
    [/faraday\s*1\b|fara?day\s+one/i, "Faraday 1"],
    [/faraday\s*2\b|fara?day\s+two/i, "Faraday 2"],
    [/faraday\s*3\b|fara?day\s+three/i, "Faraday 3"],
    [/faraday\s*4\b|fara?day\s+four/i, "Faraday 4"],
    [/faraday\s*5\b|fara?day\s+five/i, "Faraday 5"],
    [/faraday\s*6\b|fara?day\s+six/i, "Faraday 6"],
    [/faraday\s*7\b|fara?day\s+seven/i, "Faraday 7"]
  ];

  function clean(value) {
    return String(value || "")
      .replace(/&nbsp;|\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCaseName(value) {
    return clean(value).replace(/\b[a-z]/gi, (letter) => letter.toUpperCase());
  }

  function usableName(value) {
    const name = titleCaseName(value);
    if (!name || /^(student|name|first name|last name|surname|n\/a|na|unknown)$/i.test(name)) return "";
    if (/\b(student|id|number|hall|flat|room|issue|problem)\b/i.test(name)) return "";
    return name;
  }

  function firstMatch(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) return clean(match[1]);
    }
    return "";
  }

  function detectHall(text) {
    const normalized = clean(text).toLowerCase();
    const direct = HALLS.find((hall) => normalized.includes(hall.toLowerCase()));
    if (direct) return direct;

    const alias = HALL_ALIASES.find(([pattern]) => pattern.test(text));
    if (alias) return alias[1];

    const beforeHall = text.match(/\b(?:live|lives|stay|stays|staying|room|accommodation|located)\s+(?:in|at)\s+([a-z0-9 .'’-]+?)\s+hall\b/i);
    if (beforeHall) {
      const guessed = `${titleCaseName(beforeHall[1])} Hall`;
      return HALLS.find((hall) => hall.toLowerCase() === guessed.toLowerCase()) || guessed;
    }

    return "";
  }

  function detectIssue(text) {
    const explicit = firstMatch(text, [
      /\bissues?\s+(?:with|w)\s+(?:my\s+)?(.+?)(?:[.!?]|\n|$)/i,
      /\bproblem\s+(?:with|w)\s+(?:my\s+)?(.+?)(?:[.!?]|\n|$)/i,
      /\b(?:needs?|need)\s+help\s+(?:with|w)\s+(?:my\s+)?(.+?)(?:[.!?]|\n|$)/i,
      /\b(?:query|enquiry)\s+(?:about|regarding|for)\s+(.+?)(?:[.!?]|\n|$)/i,
      /\bregarding\s+(.+?)(?:[.!?]|\n|$)/i,
      /\babout\s+(.+?)(?:[.!?]|\n|$)/i
    ]);
    if (explicit) return explicit;

    const matchedType = detectEnquiryType("", text);
    if (matchedType !== "Maintenance") return matchedType.toLowerCase();
    const maintenanceMatch = ISSUE_TO_ENQUIRY_TYPE.find(([pattern, type]) => type === "Maintenance" && pattern.test(text));
    return maintenanceMatch ? "maintenance issue" : "";
  }

  function detectEnquiryType(issue, wholeText) {
    const haystack = `${issue} ${wholeText}`;
    for (const [pattern, type] of ISSUE_TO_ENQUIRY_TYPE) {
      if (pattern.test(haystack)) return type;
    }
    return "Maintenance";
  }

  function detectName(text) {
    const name = firstMatch(text, [
      /\b(?:full\s+name|student\s+name|name)\s*(?:is|:|-)?\s*([a-z][a-z .'-]+?)(?:\s+and\s+my|\s+student\s+id|\s+student\s+number|\s+id\b|\s+sid\b|\s+sno\b|[,.!?]|\n|$)/i,
      /\bmy\s+name\s+is\s+([a-z][a-z .'-]+?)(?:\s+and\s+my|\s+student\s+id|\s+student\s+number|\s+id\b|\s+sid\b|\s+sno\b|[,.!?]|\n|$)/i,
      /\bi\s+am\s+([a-z][a-z .'-]+?)(?:\s+and\s+my|\s+student\s+id|\s+student\s+number|\s+id\b|\s+sid\b|\s+sno\b|[,.!?]|\n|$)/i
    ]);
    return usableName(name);
  }

  function detectFirstName(text) {
    return usableName(firstMatch(text, [
      /\b(?:first\s+name|forename|given\s+name)\s*(?:is|:|-)?\s*([a-z][a-z'-]+)\b/i
    ]));
  }

  function detectLastName(text, fullName) {
    const explicit = firstMatch(text, [
      /\b(?:last\s+name|surname|family\s+name)\s*(?:is|:|-)?\s*([a-z][a-z'-]+)\b/i
    ]);
    if (explicit) return usableName(explicit);

    const nameParts = fullName.split(" ").filter(Boolean);
    return nameParts.length ? usableName(nameParts[nameParts.length - 1]) : "";
  }

  function parseInteraction(rawText, overrides) {
    const text = clean(rawText);
    const opts = overrides || {};
    const firstName = detectFirstName(text);
    const explicitLastName = detectLastName(text, "");
    const detectedFullName = detectName(text);
    const fullName = opts.fullName || detectedFullName || [firstName, explicitLastName].filter(Boolean).join(" ");
    const lastName = opts.lastName || detectLastName(text, fullName);
    const studentNumber = opts.studentNumber || firstMatch(text, [
      /\bstudent\s*(?:id|number|no\.?|#)?\s*(?:is|:|-)?\s*([0-9]{5,12})\b/i,
      /\b(?:brunel\s+)?id\s*(?:number|no\.?)?\s*(?:is|:|-)?\s*([0-9]{5,12})\b/i,
      /\b(?:sno|sid)\s*(?:is|:|-)?\s*([0-9]{5,12})\b/i,
      /\b([0-9]{7,8})\b/
    ]);
    const flat = firstMatch(text, [
      /\b(?:flat|apartment|apt)\s*(?:is|number|no\.?|#|:|-)?\s*([a-z]?\d+[a-z]?|\d+[a-z]?)/i,
      /\b(?:live|lives|staying|stay)\s+in\s+([a-z]?\d+[a-z]?)\s+flat\b/i,
      /\bflat\/room\s*(?:is|:|-)?\s*([a-z]?\d+[a-z]?)[/\s-]+\d+[a-z]?\b/i
    ]);
    const room = firstMatch(text, [
      /\bflat\/room\s*(?:is|:|-)?\s*[a-z]?\d+[a-z]?[/\s-]+(\d+[a-z]?)\b/i,
      /\b(?:room|rm)\s*(?:is|number|no\.?|#|:)?\s*([a-z]?\d+[a-z]?|\d+[a-z]?)/i,
      /\broom\s*(?:number|no\.?)\s*(?:is|:)?\s*([a-z]?\d+[a-z]?|\d+[a-z]?)/i,
      /\b(?:and|,)\s*([a-z]?\d+[a-z]?)\s+room\b/i
    ]);
    const hall = opts.hall || detectHall(text);
    const issue = opts.issue || detectIssue(text);
    const caseType = opts.caseType || detectCaseType(text);
    const enquiryType = opts.enquiryType || detectEnquiryType(issue, text);
    const generatedNotes = buildNotes({
      fullName,
      studentNumber,
      hall,
      flat,
      room,
      issue,
      caseType,
      enquiryType
    });

    return {
      isStudent: "Yes",
      studentNumber,
      fullName,
      lastName,
      team: "Student Experience",
      caseType,
      contactMethod: opts.contactMethod || detectContactMethod(text),
      enquiryType,
      hall,
      flat,
      room,
      issue,
      brunelAssistRefNumber: "No",
      voucherGiven: "No",
      apexRef: opts.apexRef || firstMatch(text, [/\bapex(?:\s+incident)?(?:\s+number|\s+ref)?\s*(?:is|:)?\s*([0-9]+)/i]),
      relatedApexRef: opts.relatedApexRef || firstMatch(text, [/\brelated\s+apex(?:\s+ref)?\s*(?:is|:)?\s*([a-z0-9-]+)/i]),
      chargeType: opts.chargeType || detectChargeType(text),
      chargeAmount: opts.chargeAmount || firstMatch(text, [/\b(?:charge\s+amount|amount|charged)\s*(?:is|:|-)?\s*(?:gbp|£)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i]),
      appealType: opts.appealType || detectAppealType(text),
      notes: opts.notes || generatedNotes
    };
  }

  function detectCaseType(text) {
    for (const [pattern, type] of CASE_TYPE_RULES) {
      if (pattern.test(text)) return type;
    }
    return "Enquiry";
  }

  function detectContactMethod(text) {
    if (/\bemail\b/i.test(text)) return "Email";
    if (/\bphone|call\b/i.test(text)) return "Phone";
    if (/\bin[- ]?person|reception|front desk\b/i.test(text)) return "In-person";
    if (/\bbrunel\s+assist\b/i.test(text)) return "Brunel Assist";
    if (/\bapex\b/i.test(text)) return "Apex";
    return "Live chat";
  }

  function detectChargeType(text) {
    if (/\bhealth\s*&\s*safety|health\s+and\s+safety\b/i.test(text)) return "Health & Safety";
    if (/\bsecurity\b.*\block\s*out|\block\s*out\b.*\bsecurity\b/i.test(text)) return "Lock out (Security)";
    if (/\block\s*out|locked\s+out|lockout|lost\s+key\b/i.test(text)) return "Lock out (Experience)";
    if (/\bno\s+charge\b/i.test(text)) return "No Charge";
    if (/\bdamage|damaged|broken\b/i.test(text)) return "Damage";
    return "";
  }

  function detectAppealType(text) {
    if (/\block\s*out|locked\s+out|lockout\b/i.test(text)) return "Lockout";
    if (/\bconduct\b/i.test(text)) return "Conduct";
    if (/\bdamage\b/i.test(text)) return "Damage";
    return "";
  }

  function buildNotes(data) {
    const location = [
      data.hall,
      data.flat ? `Flat ${data.flat}` : "",
      data.room ? `Room ${data.room}` : ""
    ].filter(Boolean).join(", ");

    const parts = [];
    if (data.fullName || data.studentNumber) {
      parts.push(`Student${data.fullName ? ` ${data.fullName}` : ""}${data.studentNumber ? ` (${data.studentNumber})` : ""} contacted Student Experience.`);
    } else {
      parts.push("Student contacted Student Experience.");
    }
    if (location) parts.push(`Accommodation: ${location}.`);
    if (data.issue) parts.push(`Enquiry regarding ${data.issue}.`);
    if (data.caseType === "Enquiry" && data.enquiryType) parts.push(`Recorded as ${data.enquiryType}.`);
    return parts.join(" ");
  }

  const api = { HALLS, ENQUIRY_TYPES, parseInteraction, buildNotes };
  root.StudentAutofillParser = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

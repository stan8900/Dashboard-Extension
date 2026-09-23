(function popupController() {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const fields = {
    sourceText: $("sourceText"),
    caseType: $("caseType"),
    contactMethod: $("contactMethod"),
    studentNumber: $("studentNumber"),
    lastName: $("lastName"),
    hall: $("hall"),
    room: $("room"),
    notes: $("notes"),
    apexRef: $("apexRef"),
    relatedApexRef: $("relatedApexRef"),
    chargeType: $("chargeType"),
    chargeAmount: $("chargeAmount"),
    appealType: $("appealType"),
    enquiryType: $("enquiryType")
  };

  const status = $("status");
  let latestParsed = null;

  StudentAutofillParser.HALLS.forEach((hall) => {
    const option = document.createElement("option");
    option.value = hall;
    $("halls").appendChild(option);
  });

  StudentAutofillParser.ENQUIRY_TYPES.forEach((type) => {
    const option = document.createElement("option");
    option.textContent = type;
    fields.enquiryType.appendChild(option);
  });

  function readOverrides() {
    return {
      caseType: fields.caseType.value,
      contactMethod: fields.contactMethod.value,
      studentNumber: fields.studentNumber.value.trim(),
      lastName: fields.lastName.value.trim(),
      hall: fields.hall.value.trim(),
      notes: fields.notes.value.trim(),
      apexRef: fields.apexRef.value.trim(),
      relatedApexRef: fields.relatedApexRef.value.trim(),
      chargeType: fields.chargeType.value,
      chargeAmount: fields.chargeAmount.value.trim(),
      appealType: fields.appealType.value,
      enquiryType: fields.enquiryType.value
    };
  }

  function parseAndDisplay() {
    const parsed = StudentAutofillParser.parseInteraction(fields.sourceText.value);
    fields.caseType.value = parsed.caseType;
    fields.contactMethod.value = parsed.contactMethod;
    fields.studentNumber.value = parsed.studentNumber;
    fields.lastName.value = parsed.lastName;
    fields.hall.value = parsed.hall;
    fields.room.value = parsed.room;
    fields.notes.value = parsed.notes;
    fields.apexRef.value = parsed.apexRef;
    fields.relatedApexRef.value = parsed.relatedApexRef;
    fields.chargeType.value = parsed.chargeType;
    fields.chargeAmount.value = parsed.chargeAmount;
    fields.appealType.value = parsed.appealType;
    fields.enquiryType.value = parsed.enquiryType;
    latestParsed = parsed;
    status.textContent = "Details detected. Check anything unusual before filling.";
    return parsed;
  }

  function dataFromForm() {
    const parsed = StudentAutofillParser.parseInteraction(fields.sourceText.value, readOverrides());
    return {
      ...parsed,
      caseType: fields.caseType.value,
      contactMethod: fields.contactMethod.value,
      studentNumber: fields.studentNumber.value.trim(),
      lastName: fields.lastName.value.trim(),
      hall: fields.hall.value.trim(),
      room: fields.room.value.trim(),
      notes: fields.notes.value.trim(),
      apexRef: fields.apexRef.value.trim(),
      relatedApexRef: fields.relatedApexRef.value.trim(),
      chargeType: fields.chargeType.value,
      chargeAmount: fields.chargeAmount.value.trim(),
      appealType: fields.appealType.value,
      enquiryType: fields.enquiryType.value
    };
  }

  async function fillForm() {
    if (!latestParsed && fields.sourceText.value.trim()) parseAndDisplay();
    const parsed = dataFromForm();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      status.textContent = "Could not find the active tab.";
      return;
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"]
    });

    if (!result) {
      status.textContent = "Could not load the form filler.";
      return;
    }

    const frameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (data) => window.StudentFormAutofill ? window.StudentFormAutofill.fill(data) : null,
      args: [parsed]
    });

    const usableResults = frameResults.map((item) => item.result).filter(Boolean);
    const bestResult = usableResults.reduce((best, item) => {
      if (!best) return item;
      return item.filled > best.filled ? item : best;
    }, null);

    const filled = bestResult && bestResult.filled ? bestResult.filled : 0;
    const missed = bestResult && bestResult.missed ? bestResult.missed : [];
    const foundQuestions = bestResult && bestResult.questions ? bestResult.questions : 0;
    status.textContent = missed.length
      ? `Filled ${filled} fields. Found ${foundQuestions} questions. Missed: ${missed.join(", ")}.`
      : `Filled ${filled} fields. Found ${foundQuestions} questions.`;
  }

  fields.sourceText.addEventListener("input", () => {
    latestParsed = null;
    window.clearTimeout(fields.sourceText.parseTimer);
    fields.sourceText.parseTimer = window.setTimeout(parseAndDisplay, 250);
  });
  $("parseBtn").addEventListener("click", parseAndDisplay);
  $("fillBtn").addEventListener("click", () => {
    fillForm().catch((error) => {
      status.textContent = error.message || "Could not fill the form.";
    });
  });
})();

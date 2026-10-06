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
  let batchRunning = false;

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

  function dataFromText(text) {
    return StudentAutofillParser.parseInteraction(text);
  }

  function splitCompletedRequests(rawText) {
    const text = rawText.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item : item && (item.text || item.notes || item.request || item.description)))
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Plain pasted notes are expected most of the time.
    }

    const delimiterSplit = text
      .split(/\n\s*(?:-{3,}|={3,}|\*{3,}|#{3,}|request\s+\d+\s*:|completed\s+request\s+\d+\s*:)\s*\n/i)
      .map((item) => item.trim())
      .filter(Boolean);
    if (delimiterSplit.length > 1) return delimiterSplit;

    const blocks = text.split(/\n{2,}/);
    const requests = [];
    let current = [];
    blocks.forEach((block) => {
      const startsRequest = /^(?:student\s*(?:number|id|no\.?)|id|sid|sno|name|full\s+name)\b/i.test(block.trim());
      if (startsRequest && current.length) {
        requests.push(current.join("\n\n").trim());
        current = [];
      }
      current.push(block);
    });
    if (current.length) requests.push(current.join("\n\n").trim());
    return requests.filter(Boolean);
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      status.textContent = "Could not find the active tab.";
      return null;
    }
    return tab;
  }

  async function loadFiller(tabId) {
    const result = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content.js"]
    });

    if (!result) {
      status.textContent = "Could not load the form filler.";
      return false;
    }
    return true;
  }

  function bestFrameResult(frameResults) {
    const usableResults = frameResults.map((item) => item.result).filter(Boolean);
    return usableResults.reduce((best, item) => {
      if (!best) return item;
      if (item.submitted && !best.submitted) return item;
      if (item.ready && !best.ready) return item;
      if ((item.questions || 0) > (best.questions || 0)) return item;
      return item.filled > best.filled ? item : best;
    }, null);
  }

  async function executeInFrames(tabId, func, args) {
    const frameResults = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func,
      args
    });
    return bestFrameResult(frameResults);
  }

  async function fillForm() {
    if (!latestParsed && fields.sourceText.value.trim()) parseAndDisplay();
    const parsed = dataFromForm();
    const tab = await activeTab();
    if (!tab) return;
    if (!(await loadFiller(tab.id))) return;

    const bestResult = await executeInFrames(
      tab.id,
      (data) => window.StudentFormAutofill ? window.StudentFormAutofill.fill(data) : null,
      [parsed]
    );

    const filled = bestResult && bestResult.filled ? bestResult.filled : 0;
    const missed = bestResult && bestResult.missed ? bestResult.missed : [];
    const foundQuestions = bestResult && bestResult.questions ? bestResult.questions : 0;
    status.textContent = missed.length
      ? `Filled ${filled} fields. Found ${foundQuestions} questions. Missed: ${missed.join(", ")}.`
      : `Filled ${filled} fields. Found ${foundQuestions} questions.`;
  }

  async function submitCompletedRequests() {
    if (batchRunning) return;

    const requests = splitCompletedRequests(fields.sourceText.value);
    if (!requests.length) {
      status.textContent = "Paste at least one completed request first.";
      return;
    }

    const tab = await activeTab();
    if (!tab) return;

    batchRunning = true;
    $("submitAllBtn").disabled = true;
    $("fillBtn").disabled = true;
    $("parseBtn").disabled = true;

    let submitted = 0;
    try {
      for (let index = 0; index < requests.length; index += 1) {
        status.textContent = `Submitting ${index + 1} of ${requests.length}...`;
        if (!(await loadFiller(tab.id))) return;

        const parsed = dataFromText(requests[index]);
        const result = await executeInFrames(
          tab.id,
          (data) => window.StudentFormAutofill ? window.StudentFormAutofill.fillAndSubmit(data) : null,
          [parsed]
        );

        if (!result || !result.submitted) {
          const reason = result && result.reason ? ` ${result.reason}` : "";
          status.textContent = `Stopped at ${index + 1} of ${requests.length}.${reason}`;
          return;
        }

        submitted += 1;
        if (index < requests.length - 1) {
          status.textContent = `Submitted ${submitted}. Opening next response...`;
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
          await loadFiller(tab.id);
          const nextResult = await executeInFrames(
            tab.id,
            () => window.StudentFormAutofill ? window.StudentFormAutofill.prepareNextResponse() : null,
            []
          );
          if (!nextResult || !nextResult.ready) {
            status.textContent = `Submitted ${submitted} of ${requests.length}, but I could not open the next blank response.`;
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }
      }

      status.textContent = `Submitted ${submitted} of ${requests.length} completed requests.`;
    } finally {
      batchRunning = false;
      $("submitAllBtn").disabled = false;
      $("fillBtn").disabled = false;
      $("parseBtn").disabled = false;
    }
  }

  async function inspectForm() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      status.textContent = "Could not find the active tab.";
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"]
    });

    const frameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => window.StudentFormAutofill ? window.StudentFormAutofill.inspect() : null
    });

    const inspected = frameResults
      .map((item) => item.result)
      .filter(Boolean)
      .sort((a, b) => b.questions - a.questions);

    const best = inspected[0];
    if (!best || !best.questions) {
      status.textContent = "I can access the page, but I found 0 form questions.";
      return;
    }

    const labels = best.sample
      .slice(0, 8)
      .map((question) => `${question.index}. ${question.label}`)
      .join(" | ");
    status.textContent = `Found ${best.questions} questions. First labels: ${labels}`;
  }

  fields.sourceText.addEventListener("input", () => {
    latestParsed = null;
    window.clearTimeout(fields.sourceText.parseTimer);
    fields.sourceText.parseTimer = window.setTimeout(parseAndDisplay, 250);
  });
  $("parseBtn").addEventListener("click", parseAndDisplay);
  $("inspectBtn").addEventListener("click", () => {
    inspectForm().catch((error) => {
      status.textContent = error.message || "Could not inspect the form.";
    });
  });
  $("fillBtn").addEventListener("click", () => {
    fillForm().catch((error) => {
      status.textContent = error.message || "Could not fill the form.";
    });
  });
  $("submitAllBtn").addEventListener("click", () => {
    submitCompletedRequests().catch((error) => {
      status.textContent = error.message || "Could not submit completed requests.";
    });
  });
})();

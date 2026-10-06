(function formAutofill() {
  "use strict";

  const FIELD_SETS = {
    base: [
      ["Is the enquirer a student?", "isStudent", "choice"],
      ["Student Number", "studentNumber", "text"],
      ["Last Name", "lastName", "text"],
      ["Team Recording Enquiry", "team", "choice"],
      ["Type", "caseType", "choice"]
    ],
    Enquiry: [
      ["Method of contact", "contactMethod", "choice"],
      ["Enquiry Type", "enquiryType", "choice"],
      ["Hall", "hall", "choice"],
      ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
      ["Voucher Given", "voucherGiven", "choice"],
      ["Notes", "notes", "text"]
    ],
    Conduct: [
      ["Apex Incident Number", "apexRef", "text"],
      ["Related Apex Ref", "relatedApexRef", "text"],
      ["Hall", "hall", "choice"],
      ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
      ["Voucher Given", "voucherGiven", "choice"],
      ["Notes", "notes", "text"]
    ],
    Charge: [
      ["Charge Type", "chargeType", "choice"],
      ["Charge Amount", "chargeAmount", "text"],
      ["Related Apex Ref", "relatedApexRef", "text"],
      ["Hall", "hall", "choice"],
      ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
      ["Voucher Given", "voucherGiven", "choice"],
      ["Notes", "notes", "text"]
    ],
    Appeal: [
      ["Appeal Type", "appealType", "choice"],
      ["Related Apex Ref", "relatedApexRef", "text"],
      ["Hall", "hall", "choice"],
      ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
      ["Voucher Given", "voucherGiven", "choice"],
      ["Notes", "notes", "text"]
    ],
    Complaint: [
      ["Hall", "hall", "choice"],
      ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
      ["Voucher Given", "voucherGiven", "choice"],
      ["Notes", "notes", "text"]
    ]
  };

  function normalize(value) {
    return String(value || "")
      .replace(/[*:]/g, "")
      .replace(/^\s*\d+\s*[.)-]?\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function visibleEnough(element) {
    const style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function visible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }

  function meaningfulContainer(node) {
    return node && node.querySelector && node.querySelector("input, textarea, select, [role='radio'], [role='option'], [role='checkbox'], [contenteditable='true']");
  }

  function questionContainers() {
    const selectors = [
      "[data-automation-id='questionItem']",
      "[data-automation-id='questionContainer']",
      "[data-automation-id='field-list-item']",
      "[data-automation-id='formField']",
      "[data-testid*='question']",
      "[class*='question']",
      "[class*='Question']",
      "[role='group']",
      "fieldset",
      ".office-form-question",
      ".freebirdFormviewerComponentsQuestionBaseRoot"
    ];
    const found = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!found.includes(node) && visibleEnough(node) && meaningfulContainer(node)) found.push(node);
      });
    });
    if (found.length) {
      return found.sort((a, b) => (a.innerText || a.textContent || "").length - (b.innerText || b.textContent || "").length);
    }

    return Array.from(document.querySelectorAll("fieldset, li, section, div"))
      .filter((node) => visibleEnough(node) && meaningfulContainer(node))
      .sort((a, b) => a.innerText.length - b.innerText.length)
      .slice(0, 200);
  }

  function labelRegex(label) {
    const escaped = normalize(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    return new RegExp(`(?:^|\\n|\\s)\\d*\\s*[.)-]?\\s*${escaped}(?:\\s|\\n|$)`, "i");
  }

  function controlElements(container) {
    return Array.from(container.querySelectorAll("input, textarea, select, [contenteditable='true']"))
      .filter(visible);
  }

  function containerScore(container, target, pattern) {
    const text = normalize(container.innerText || container.textContent);
    const rawText = container.innerText || container.textContent || "";
    const controls = controlElements(container).length;
    const length = rawText.length;
    let score = 0;
    if (text === target) score -= 1000;
    if (text.startsWith(`${target} `)) score -= 500;
    if (pattern.test(rawText)) score -= 250;
    if (controls === 1) score -= 150;
    score += controls * 75;
    score += length;
    return score;
  }

  function findQuestion(label) {
    const target = normalize(label);
    const pattern = labelRegex(label);
    const containers = questionContainers();
    const matches = containers
      .filter((container) => {
        const text = normalize(container.innerText || container.textContent);
        return text === target || text.startsWith(`${target} `) || pattern.test(container.innerText || container.textContent);
      })
      .sort((a, b) => containerScore(a, target, pattern) - containerScore(b, target, pattern));
    if (matches[0]) return matches[0];

    const textNode = Array.from(document.querySelectorAll("label, legend, span, div, p"))
      .filter(visibleEnough)
      .find((node) => pattern.test(node.innerText || node.textContent));

    if (!textNode) return null;
    const candidates = [];
    let node = textNode;
    while (node && node !== document.body) {
      if (meaningfulContainer(node)) candidates.push(node);
      node = node.parentElement;
    }
    return candidates.sort((a, b) => containerScore(a, target, pattern) - containerScore(b, target, pattern))[0] || textNode.parentElement;
  }

  function foundQuestionCount() {
    return questionContainers().length;
  }

  function inspect() {
    const questions = questionContainers().map((container, index) => {
      const label = (container.innerText || container.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 220);
      const controls = Array.from(container.querySelectorAll("input, textarea, select, [role='radio'], [role='option'], [role='combobox'], [role='checkbox'], button"))
        .filter(visibleEnough)
        .map((node) => {
          const type = node.tagName.toLowerCase() === "input" ? node.getAttribute("type") || "input" : node.getAttribute("role") || node.tagName.toLowerCase();
          const text = (node.innerText || node.getAttribute("aria-label") || node.getAttribute("placeholder") || node.value || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
          return text ? `${type}: ${text}` : type;
        })
        .slice(0, 12);
      return { index: index + 1, label, controls };
    });

    return {
      href: location.href,
      title: document.title,
      questions: questions.length,
      sample: questions.slice(0, 20)
    };
  }

  function setNativeValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function labelCandidates(label, key) {
    const aliases = {
      isStudent: [
        "Is the enquirer a student?",
        "Is the enquirer student?",
        "Student?",
        "Enquirer a student?"
      ],
      studentNumber: [
        "Student Number",
        "Student ID",
        "Student Id",
        "Student No",
        "Student No.",
        "ID",
        "SID",
        "SNo"
      ],
      lastName: [
        "Last Name",
        "Surname",
        "Family Name"
      ],
      team: [
        "Team Recording Enquiry",
        "Team recording enquiry",
        "Recording Enquiry Team",
        "Recording enquiry team",
        "Team"
      ]
    };
    return aliases[key] || [label];
  }

  function activate(element) {
    if (!element) return;
    element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, view: window }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, view: window }));
    element.click();
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fieldHints(key) {
    const hints = {
      studentNumber: ["student number", "student id", "student no", "sid", "sno", "id"],
      lastName: ["last name", "surname", "family name"],
      notes: ["notes", "details", "description", "summary"],
      apexRef: ["apex incident number", "apex ref", "incident number"],
      relatedApexRef: ["related apex ref", "related apex", "related reference"],
      chargeAmount: ["charge amount", "amount"]
    };
    return hints[key] || [];
  }

  function textInputScore(input, key) {
    const haystack = normalize([
      input.getAttribute("aria-label"),
      input.getAttribute("placeholder"),
      input.getAttribute("name"),
      input.getAttribute("id"),
      input.closest("label") && input.closest("label").innerText
    ].filter(Boolean).join(" "));
    const hints = fieldHints(key);
    const matched = hints.some((hint) => haystack.includes(normalize(hint)));
    const wrongStatus = key === "lastName" && /\bstatus\b/.test(haystack);
    const wrongLastName = key === "studentNumber" && /\b(last name|surname|family name|status)\b/.test(haystack);
    return (matched ? -1000 : 0) + (wrongStatus || wrongLastName ? 10000 : 0) + haystack.length;
  }

  function fillText(container, value, key) {
    if (!value) return false;
    const inputs = Array.from(container.querySelectorAll("textarea, input[type='text'], input[type='number'], input[type='email'], input[type='tel'], input:not([type]), [contenteditable='true']"))
      .filter(visible)
      .sort((a, b) => textInputScore(a, key) - textInputScore(b, key));
    const input = inputs[0];
    if (!input) return false;
    input.focus();
    if (input.isContentEditable) {
      input.textContent = value;
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    } else {
      setNativeValue(input, value);
    }
    input.blur();
    return true;
  }

  function optionCandidates(container) {
    return Array.from(container.querySelectorAll("label, [role='radio'], [role='option'], [role='checkbox'], button, span, div, input"))
      .filter(visible)
      .filter((node) => normalize(node.innerText || node.getAttribute("aria-label") || node.value).length);
  }

  function optionText(node) {
    return normalize(node.innerText || node.getAttribute("aria-label") || node.value || "");
  }

  function exactOption(container, value) {
    const wanted = normalize(value);
    const candidates = optionCandidates(container);
    const exact = candidates.find((node) => optionText(node) === wanted);
    if (exact) return exact;

    return candidates.find((node) => {
      const text = optionText(node);
      if (text.startsWith(`${wanted} `)) return true;
      return wanted.length >= 8 && text.includes(wanted);
    });
  }

  function selectNative(container, value) {
    const select = container.querySelector("select");
    if (!select) return false;
    const wanted = normalize(value);
    const option = Array.from(select.options).find((item) => normalize(item.textContent) === wanted || normalize(item.value) === wanted);
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function typeCombobox(container, value) {
    const combo = container.querySelector("[role='combobox'], input[aria-autocomplete], input[aria-haspopup='listbox']");
    if (!combo) return false;
    combo.focus();
    combo.click();
    if ("value" in combo) {
      setNativeValue(combo, value);
    } else {
      combo.textContent = value;
      combo.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    }
    combo.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    combo.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
    combo.blur();
    return true;
  }

  async function clickGlobalOption(value) {
    await sleep(120);
    const wanted = normalize(value);
    const option = Array.from(document.querySelectorAll("[role='option'], [role='menuitemradio'], [role='radio'], label, button"))
      .filter(visible)
      .find((node) => {
        const text = normalize(node.innerText || node.getAttribute("aria-label"));
        if (text === wanted || text.startsWith(`${wanted} `)) return true;
        return wanted.length >= 8 && text.includes(wanted);
      });
    if (!option) return false;
    const clickable = option.closest("[role='option'], [role='menuitemradio'], [role='radio'], button, label") || option;
    activate(clickable);
    return true;
  }

  async function clickChoice(container, value) {
    if (!value) return false;
    if (selectNative(container, value)) return true;

    const option = exactOption(container, value);
    if (option) {
      const input = option.matches("input") ? option : option.querySelector && option.querySelector("input");
      const clickable = input || option.closest("label, [role='radio'], [role='option'], [role='checkbox'], button") || option;
      clickable.scrollIntoView({ block: "center", inline: "nearest" });
      activate(clickable);
      return true;
    }

    const dropdown = container.querySelector("[role='combobox'], [aria-haspopup='listbox'], button, input");
    if (dropdown) {
      dropdown.scrollIntoView({ block: "center", inline: "nearest" });
      dropdown.click();
      if (await clickGlobalOption(value)) return true;
    }

    return typeCombobox(container, value);
  }

  function waitForQuestionCountChange(previousCount, timeoutMs) {
    const started = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        const currentCount = foundQuestionCount();
        if (currentCount && currentCount !== previousCount) {
          resolve({ changed: true, questions: currentCount });
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve({ changed: false, questions: currentCount });
          return;
        }
        window.setTimeout(check, 200);
      };
      check();
    });
  }

  async function fillOne(label, key, mode, data) {
    const value = data[key];
    if (!value) return { skipped: true };

    const labels = labelCandidates(label, key);
    const container = labels.map(findQuestion).find(Boolean);
    if (!container) return { missed: true };

    const ok = mode === "choice" ? await clickChoice(container, value) : fillText(container, value, key);
    return ok ? { filled: true } : { missed: true };
  }

  function fieldsFor(data) {
    const caseSpecific = FIELD_SETS[data.caseType] || FIELD_SETS.Enquiry;
    if (data.caseType === "Enquiry" && data.enquiryType === "Flat Disputes") {
      return FIELD_SETS.base.concat([
        ["Method of contact", "contactMethod", "choice"],
        ["Enquiry Type", "enquiryType", "choice"],
        ["Apex Incident Number", "apexRef", "text"],
        ["Related Apex Ref", "relatedApexRef", "text"],
        ["Brunel Assist Ref Number", "brunelAssistRefNumber", "choice"],
        ["Voucher Given", "voucherGiven", "choice"],
        ["Notes", "notes", "text"]
      ]);
    }
    return FIELD_SETS.base.concat(caseSpecific);
  }

  async function fill(data) {
    data.team = "Student Experience";
    let filled = 0;
    const missed = [];
    const fields = fieldsFor(data);

    for (const [label, key, mode] of fields) {
      const result = await fillOne(label, key, mode, data);
      if (result.filled) filled += 1;
      if (result.missed) missed.push(label);
      await sleep(mode === "choice" ? 2000 : 250);
    }

    if (missed.length) {
      await sleep(900);
      const retry = missed.splice(0, missed.length);
      for (const label of retry) {
        const field = fields.find(([fieldLabel]) => fieldLabel === label);
        if (!field) continue;
        const result = await fillOne(field[0], field[1], field[2], data);
        if (result.filled) filled += 1;
        if (result.missed) missed.push(label);
        await sleep(180);
      }
    }

    await sleep(150);
    return { filled, missed, questions: foundQuestionCount() };
  }

  function submitCandidates() {
    return Array.from(document.querySelectorAll("button, input[type='submit'], [role='button']"))
      .filter(visible)
      .filter((node) => {
        const text = normalize(node.innerText || node.value || node.getAttribute("aria-label") || "");
        return text === "submit" || text === "send" || text === "record" || text.includes("submit");
      });
  }

  async function submit() {
    await sleep(250);
    const button = submitCandidates()[0];
    if (!button) return { submitted: false, reason: "Submit button not found." };
    button.scrollIntoView({ block: "center", inline: "nearest" });
    button.click();
    return { submitted: true };
  }

  async function prepareNextResponse() {
    const previousCount = foundQuestionCount();
    await sleep(2000);
    const next = Array.from(document.querySelectorAll("button, a, [role='button']"))
      .filter(visible)
      .find((node) => {
        const text = normalize(node.innerText || node.getAttribute("aria-label") || "");
        return text.includes("submit another") || text.includes("another response") || text.includes("new response");
      });

    if (next) {
      next.scrollIntoView({ block: "center", inline: "nearest" });
      activate(next);
    }

    await sleep(2000);
    const change = await waitForQuestionCountChange(previousCount, 3000);
    return { ready: Boolean(next) || change.questions > 0, questions: change.questions };
  }

  async function fillAndSubmit(data) {
    const fillResult = await fill(data);
    const submitResult = await submit();
    return { ...fillResult, ...submitResult };
  }

  window.StudentFormAutofill = { fill, fillAndSubmit, inspect, prepareNextResponse, submit };
})();

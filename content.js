(function formAutofill() {
  "use strict";

  if (window.StudentFormAutofill) return;

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

  function findQuestion(label) {
    const target = normalize(label);
    const pattern = labelRegex(label);
    const containers = questionContainers();
    const exact = containers.find((container) => {
      const text = normalize(container.innerText || container.textContent);
      return text === target || text.startsWith(`${target} `) || pattern.test(container.innerText || container.textContent);
    });
    if (exact) return exact;

    const textNode = Array.from(document.querySelectorAll("label, legend, span, div, p"))
      .filter(visibleEnough)
      .find((node) => pattern.test(node.innerText || node.textContent));

    if (!textNode) return null;
    return textNode.closest("[data-automation-id='questionItem'], [data-automation-id='questionContainer'], [data-automation-id='field-list-item'], [data-automation-id='formField'], [role='group'], fieldset, li, section, div") || textNode.parentElement;
  }

  function foundQuestionCount() {
    return questionContainers().length;
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

  function fillText(container, value) {
    if (!value) return false;
    const input = container.querySelector("textarea, input[type='text'], input[type='number'], input[type='email'], input[type='tel'], input:not([type]), [contenteditable='true']");
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
      .filter((node) => normalize(node.innerText || node.getAttribute("aria-label")).length);
  }

  function exactOption(container, value) {
    const wanted = normalize(value);
    return optionCandidates(container).find((node) => {
      const text = normalize(node.innerText || node.getAttribute("aria-label"));
      return text === wanted || text.startsWith(`${wanted} `) || text.includes(wanted);
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
    const option = Array.from(document.querySelectorAll("[role='option'], [role='menuitemradio'], [role='radio'], button, span, div"))
      .filter(visible)
      .find((node) => {
        const text = normalize(node.innerText || node.getAttribute("aria-label"));
        return text === wanted || text.startsWith(`${wanted} `) || text.includes(wanted);
      });
    if (!option) return false;
    const clickable = option.closest("[role='option'], [role='menuitemradio'], [role='radio'], button, label") || option;
    clickable.click();
    return true;
  }

  async function clickChoice(container, value) {
    if (!value) return false;
    if (selectNative(container, value)) return true;

    const option = exactOption(container, value);
    if (option) {
      const clickable = option.closest("label, [role='radio'], [role='option'], [role='checkbox'], button") || option;
      clickable.scrollIntoView({ block: "center", inline: "nearest" });
      clickable.click();
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

  async function fillOne(label, key, mode, data) {
    const value = data[key];
    if (!value) return { skipped: true };

    const container = findQuestion(label);
    if (!container) return { missed: true };

    const ok = mode === "choice" ? await clickChoice(container, value) : fillText(container, value);
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
    for (const [label, key, mode] of fieldsFor(data)) {
      const result = await fillOne(label, key, mode, data);
      if (result.filled) filled += 1;
      if (result.missed) missed.push(label);
      await sleep(80);
    }
    return { filled, missed, questions: foundQuestionCount() };
  }

  window.StudentFormAutofill = { fill };
})();

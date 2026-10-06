# Student Enquiry Autofill

Chrome/Edge extension for turning a pasted student interaction note into form answers.

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `Dashboard Extension`.

## Use

1. Open the recording enquiry form.
2. Click the extension.
3. Paste your notepad text.
4. Check the detected fields.
5. Click **Fill form**.

For a batch of completed requests, paste the full list into the note box and click **Submit all**. Separate requests with a line containing `---`, `===`, or `***`; JSON arrays of request strings are also accepted. The extension fills and submits each request one at a time, then tries to open the next blank response before continuing.

The extension keeps the pasted text in your browser and does not send it anywhere.

Defaults:

- `Is the enquirer a student?` -> `Yes`
- `Team Recording Enquiry` -> `Student Experience`
- `Brunel Assist Ref Number` -> `No`
- `Voucher Given` -> `No`
- Contact method -> `Live chat` unless the note says email, phone, in-person, Brunel Assist, or Apex

The parser detects student number, full name, last name/surname, hall, flat, room, issue, enquiry type, charge details, appeal type, and Apex references where possible.

It classifies the interaction from keywords. Examples:

- `bathroom`, `leak`, `broken`, `heating`, `mould`, `door`, `window` -> `Maintenance`
- `locked out`, `lost key`, `lockout`, `Salto` -> `Lock out`
- `flatmate`, `noise`, `dispute`, `antisocial` -> `Flat Disputes`
- `room change`, `swap`, `transfer` -> `Room Change`
- `contract`, `rent`, `instalment`, `agreement` -> `Contract Query`
- `charge`, `fine`, `invoice`, `damage cost` -> `Charge`
- `appeal`, `challenge fine`, `dispute charge` -> `Appeal`

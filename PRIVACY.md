# TabTab Privacy Policy

Last updated: June 2, 2026

TabTab is a Chrome extension that helps users save, manage, and restore browser tab sessions.

## Data TabTab Stores

TabTab stores data only when a user chooses to save or configure something in the extension. This may include:

- Saved session names
- Tab URLs selected by the user
- Tab titles
- Tab favicons
- Session creation timestamps
- Theme, language, background, and layout preferences

## How Data Is Used

TabTab uses this data only to provide its single purpose: saving, managing, and restoring browser tab sessions.

For example, saved tab URLs and titles are used to display saved sessions and reopen tabs when the user restores a session.

## Local Storage Only

TabTab stores data locally on the user's device using `chrome.storage.local` and browser local storage.

TabTab does not upload saved sessions, tab URLs, browsing data, settings, or any other user data to any external server.

## Data Sharing

TabTab does not sell, share, transfer, or disclose user data to third parties.

TabTab does not use user data for advertising, analytics, creditworthiness, lending, or any purpose unrelated to tab session management.

## Remote Code

TabTab does not execute remote code. All extension JavaScript, CSS, and HTML are packaged with the extension.

The extension may display website favicons when available, but it does not load or execute remote scripts.

## Permissions

TabTab requests the following Chrome permissions:

- `tabs`: used to read user-selected tab titles, URLs, favicons, and tab order so tabs can be saved and restored.
- `storage`: used to store saved sessions and user preferences locally.
- `windows`: used to restore a saved session by opening tabs in a new browser window.

## Contact

For questions or support, please use the GitHub repository:

https://github.com/LeonBytes/tabtab

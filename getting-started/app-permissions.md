---
description: >-
  Understand the necessary permissions for LAPD Central and how they ensure
  optimal functionality.
icon: ballot-check
layout:
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# App Permissions

When you invite LAPD Central to your server, you'll be prompted to accept permissions that are essential for the app to operate effectively. We request only the permissions crucial for functionality, avoiding any unnecessary access. We advise against granting Administrator permissions unless you are sure of the app or any app's security and trustworthiness.

Below, you'll find a detailed explanation of each required permission and its context. Lack of certain permissions may result in errors or unexpected behavior with specific commands or functionalities.

## **Necessary Permissions:**

<details>

<summary>View Channel</summary>

**Purpose**

Almost required by every Discord application and became a standard. This permission allows LAPD Central to access text, thread, and voice channels (though voice is not used) within your server, enabling the app to read necessary channel information and messages. We only read and process messages that mention the client user for application configuration, specifically to select channels or threads as logging destinations.

**Use Cases**

The primary use of this permission is to designate _and_ utilize text channels or threads for logging activities, including but not limited to:

* [**UAN Modules**](#user-content-fn-1)[^1]**:** Log and post user activity notices and events.
* **Duty Activities Module:** Log and post citations, incident reports, and arrests.
* **Shift Management Module:** Log shift events to designated channels or threads.

</details>

<details>

<summary>Send Messages</summary>

**Purpose**\
Allows LAPD Central to send messages in channels and threads, providing responses, notifications, logs, and confirmations to users.

**Use Cases**

* Post logs and notifications.
* Respond to user commands and requests.

- Send confirmations for actions like role assignments or shift changes.

</details>

<details>

<summary>Send Messages In Threads</summary>

**Purpose:**\
Enables sending messages in thread channels for logging, notifications, or thread-based features.

**Use Cases:**\
Similar to the Send Messages permission. Disregard if threads are not used for logging or user-submitted requests.

</details>

<details>

<summary>Read Message History</summary>

**Purpose:**\
Allows the app to read its previously sent messages for context in updating user requests or other interactive features.

**Use Cases:**

* [**UAN Modules**](#user-content-fn-1)[^1]**:** Update the status of a user-submitted request based on the reviewer's decision.

</details>

<details>

<summary>Add Reactions</summary>

**Purpose:**\
Adding reactions for interactive prompts, confirmations, or pagination controls.

**Use Cases:**

* Incorporating reactions for interactive prompts

- Confirmations such as setting up a destination logging channel or thread using text format instead of selecting destination using regular select menus.

</details>

<details>

<summary>Manage Roles</summary>

**Purpose:**\
Permits the app to assign or remove roles from members.

**Use Cases:**

* Assign or remove LOA/RA roles.
* Restore roles from backups.
* Manage shift roles for members.

</details>

<details>

<summary>Manage Nicknames</summary>

**Purpose:**\
Allows changing member nicknames for automated formatting purposes.

**Use Case:**\
Reformatting nicknames with the `/nicknames replace` command. Additional features may be developed in the future.

</details>

<details>

<summary>Attach Files</summary>

**Purpose:**\
Enables the app to send files as message attachments, such as exporting logs, reports, backups, or directly attaching images to prompts or records whenever needed.

**Use Cases:**

* Attaching images to prompts and log records.
* Attaching imported shift data file when logging shift data import.

</details>

[^1]: This consist of Leave of Absence and Reduced Activity modules.

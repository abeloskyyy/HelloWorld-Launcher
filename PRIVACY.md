# Privacy Policy for HelloWorld Launcher

**Last Updated: November 22, 2026**

At HelloWorld Launcher, we prioritize transparency and user privacy. This document outlines how data is handled across the application, website, and optional diagnostics.

---

## 1. Core Principle: Privacy First & No Unwanted Tracking

By default, HelloWorld Launcher does **not** collect, sell, or transmit telemetry or tracking data.
* **Credentials:** All Microsoft authentication is processed through official OAuth flows (`msmc` / Xbox Live). Your Microsoft password never passes through or gets stored on our infrastructure.
* **Offline Mode:** Offline play is strictly local and generates no outbound tracking.
* **Community Accounts (HelloWorld Auth):** If you create a HelloWorld community account, only your chosen username, email, and public workshop items/badges are securely stored on our backend.

---

## 2. Optional Diagnostic & Telemetry System (Strictly Opt-In)

Starting with version 3.2.0, HelloWorld Launcher includes an **optional diagnostic and crash reporting system** designed exclusively to help identify game crashes, fix launcher bugs, and detect incompatible custom mods.

### A. Disabled by Default
* The telemetry system is **100% disabled by default** (`telemetry_enabled: false`).
* No technical reports, logs, or metrics are collected or transmitted unless you explicitly activate it in **Settings → "Send Diagnostics & Telemetry"**.

### B. What Information is Collected When Enabled
When and only when enabled by the user, the following information may be sent upon game crashes, launcher errors, or during a periodic 10-minute session heartbeat:
* **Crash Dumps & Logs:** Minecraft crash reports (`crash-reports/`), recent terminal output, and JavaScript console errors.
* **Technical Hardware Specs:** Operating system (OS platform, kernel, and Linux distribution), CPU model and core count, total and available RAM, graphics card (GPU) renderer, and Minecraft/Java runtime version.
* **Profile & Custom Mods Breakdown:** Active profile name, mod loader (Fabric, Forge, NeoForge, etc.), allocated memory, and an inventory of unmanaged mods, resourcepacks, or shaders found in the instance folder to help diagnose mod conflicts.
* **Account Identifier & IP:** The active username (IGN or HelloWorld nickname) so support can correlate reports, and the client IP address (captured server-side via Cloudflare for edge routing).

### C. Infrastructure & Security
* Telemetry reports and logs are transmitted securely via TLS and stored in **Cloudflare D1 (relational database)** and **Cloudflare R2 (encrypted object storage)**.
* Telemetry data is never monetized, sold, or shared with third-party advertisers.

### D. User Control & Right to Disable
You maintain full control over this feature at all times:
* You can turn off telemetry instantly with a single toggle in **Settings → "Send Diagnostics & Telemetry"**.
* Once disabled, all transmissions immediately stop.

---

## 3. Third-Party Services

We integrate with trusted service providers strictly to deliver core launcher functionalities:
* **Cloudflare:** CDN, DDoS protection, edge API routing, and optional telemetry storage.
* **Microsoft / Mojang:** Official game authentication, skins, and vanilla asset delivery.
* **Modrinth API:** Public mod, modpack, resource pack, and shader discovery.
* **GitHub:** Source code repository and release asset distribution.
* **SignPath Foundation:** Code signing and build authenticity verification.

---

## 4. Your Rights

You have the right to request information about, review, or request the deletion of data associated with your HelloWorld account or submitted telemetry reports. To make a request, contact us at the address below.

---

## 5. Contact

If you have any questions or feedback regarding this privacy policy or our diagnostic practices, contact:
* **Email:** abelosky.dev@gmail.com
* **GitHub:** [https://github.com/Abeloskyyy/HelloWorld-Launcher](https://github.com/Abeloskyyy/HelloWorld-Launcher)

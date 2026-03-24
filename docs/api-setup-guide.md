# StuPath Avatar — LTI 1.3 Setup Guide

This guide walks through configuring StuPath Avatar as an LTI 1.3 tool in each supported Learning Management System. All LMS platforms follow the same core flow: register a developer key / external tool, then supply the StuPath endpoint URLs.

---

## Common Configuration Values

Use the following values when configuring any LMS. Replace `app.stupath.com` with your deployment's domain if self-hosting.

| Parameter | Value |
|---|---|
| **Tool URL (Launch)** | `https://app.stupath.com/api/v1/lti/launch` |
| **OIDC Login URL** | `https://app.stupath.com/api/v1/lti/login` |
| **Redirect URI** | `https://app.stupath.com/api/v1/lti/launch` |
| **Public Keyset URL (JWKS)** | `https://app.stupath.com/api/v1/lti/.well-known/jwks` |

### Required LTI Services

StuPath Avatar requires the following LTI Advantage services to be enabled:

- **Assignment and Grade Services (AGS)** — pushes scores back to the gradebook.
- **Names and Role Provisioning Services (NRPS)** — retrieves the course roster for accommodation settings and proctoring.
- **Deep Linking** — allows instructors to place specific exams as links inside course content.

---

## Canvas (Instructure)

### 1. Create a Developer Key

1. Navigate to **Admin → Developer Keys → + Developer Key → LTI Key**.
2. Set the **Key Name** to `StuPath Avatar`.
3. Under **Configure**, choose **Manual Entry** and fill in:
   - **Target Link URI** — `https://app.stupath.com/api/v1/lti/launch`
   - **OpenID Connect Initiation URL** — `https://app.stupath.com/api/v1/lti/login`
   - **JWK Method** — select **Public JWK URL** and enter `https://app.stupath.com/api/v1/lti/.well-known/jwks`
   - **Redirect URIs** — `https://app.stupath.com/api/v1/lti/launch`
4. Under **LTI Advantage Services**, enable:
   - Can create and view assignment data in the gradebook (AGS)
   - Can view assignment data in the gradebook (AGS)
   - Can access the Names and Role Provisioning Service (NRPS)
5. Under **Additional Settings**, set **Privacy Level** to `Public` so StuPath can receive user names and emails.
6. Click **Save** and toggle the key to **ON**.
7. Copy the **Client ID** (displayed in the Details column).

### 2. Install in a Course or Account

1. Go to **Settings → Apps → + App → By Client ID**.
2. Paste the Client ID from the developer key.
3. Click **Submit** and approve the installation.

### 3. Provide Canvas Details to StuPath

In the StuPath admin panel or `.env`, configure:

- `LTI_PLATFORM_URL` — `https://<your-canvas-domain>`
- `LTI_CLIENT_ID` — the Client ID from the developer key
- `LTI_AUTH_ENDPOINT` — `https://<your-canvas-domain>/api/lti/authorize_redirect`
- `LTI_TOKEN_ENDPOINT` — `https://<your-canvas-domain>/login/oauth2/token`
- `LTI_KEYSET_ENDPOINT` — `https://<your-canvas-domain>/api/lti/security/jwks`

---

## Blackboard (Anthology)

### 1. Register the LTI Tool

1. Navigate to **System Admin → Integrations → LTI Tool Providers → Register LTI 1.3 Tool**.
2. Enter the **Client ID** provided by StuPath, or register a new application:
   - **Application Name** — `StuPath Avatar`
   - **Domain** — `app.stupath.com`
   - **Login Initiation URL** — `https://app.stupath.com/api/v1/lti/login`
   - **Tool Redirect URL(s)** — `https://app.stupath.com/api/v1/lti/launch`
   - **Tool JWKS URL** — `https://app.stupath.com/api/v1/lti/.well-known/jwks`
3. After registration, Blackboard generates a **Client ID**, **Deployment ID**, and **Issuer URL**.

### 2. Configure Placements

1. Open the registered tool and navigate to **Manage Placements → Create Placement**.
2. Set:
   - **Label** — `StuPath Avatar Exam`
   - **Type** — `Deep Linking content tool`
   - **Target Link URI** — `https://app.stupath.com/api/v1/lti/launch`
3. Enable the required services (AGS, NRPS) under the tool's **Service Access** settings.

### 3. Provide Blackboard Details to StuPath

- `LTI_PLATFORM_URL` — `https://<your-blackboard-domain>`
- `LTI_CLIENT_ID` — from registration
- `LTI_DEPLOYMENT_ID` — from registration
- `LTI_AUTH_ENDPOINT` — `https://developer.blackboard.com/api/v1/gateway/oidcauth`
- `LTI_TOKEN_ENDPOINT` — `https://<your-blackboard-domain>/learn/api/public/v1/oauth2/token`
- `LTI_KEYSET_ENDPOINT` — `https://<your-blackboard-domain>/learn/api/public/v1/management/applications/<client_id>/jwks.json`

---

## Moodle

### 1. Configure as an External Tool

1. Navigate to **Site Administration → Plugins → Activity Modules → External Tool → Manage Tools**.
2. Click **Configure a tool manually** and enter:
   - **Tool Name** — `StuPath Avatar`
   - **Tool URL** — `https://app.stupath.com/api/v1/lti/launch`
   - **LTI Version** — `LTI 1.3`
   - **Public Keyset URL** — `https://app.stupath.com/api/v1/lti/.well-known/jwks`
   - **Initiate Login URL** — `https://app.stupath.com/api/v1/lti/login`
   - **Redirection URI(s)** — `https://app.stupath.com/api/v1/lti/launch`
3. Under **Services**:
   - **IMS LTI Assignment and Grade Services** — `Use this service for grade sync and column management`
   - **IMS LTI Names and Role Provisioning** — `Use this service to retrieve members' information as per privacy settings`
4. Under **Privacy**, set **Share launcher's name** and **Share launcher's email** to `Always`.
5. Click **Save Changes**.
6. Moodle displays a **Registration ID**, **Platform ID**, **Client ID**, **Deployment ID**, **Public Keyset URL**, **Access Token URL**, and **Authentication Request URL**.

### 2. Provide Moodle Details to StuPath

- `LTI_PLATFORM_URL` — `https://<your-moodle-domain>`
- `LTI_CLIENT_ID` — from tool configuration
- `LTI_DEPLOYMENT_ID` — from tool configuration
- `LTI_AUTH_ENDPOINT` — `https://<your-moodle-domain>/mod/lti/auth.php`
- `LTI_TOKEN_ENDPOINT` — `https://<your-moodle-domain>/mod/lti/token.php`
- `LTI_KEYSET_ENDPOINT` — `https://<your-moodle-domain>/mod/lti/certs.php`

---

## Brightspace D2L

### 1. Register an LTI Advantage Tool

1. Navigate to **Manage Extensibility → LTI Advantage → Register Tool**.
2. Enter the following:
   - **Name** — `StuPath Avatar`
   - **Domain** — `app.stupath.com`
   - **Redirect URLs** — `https://app.stupath.com/api/v1/lti/launch`
   - **OpenID Connect Login URL** — `https://app.stupath.com/api/v1/lti/login`
   - **Keyset URL** — `https://app.stupath.com/api/v1/lti/.well-known/jwks`
3. Under **Extensions**, enable:
   - Assignment and Grade Services
   - Names and Role Provisioning Services
   - Deep Linking
4. Click **Register** and note the **Client ID** and **Deployment ID**.

### 2. Create a Deployment

1. Open the registered tool → **View Deployments → New Deployment**.
2. Set:
   - **Name** — `StuPath Avatar - Production`
   - **Security Settings** — enable `Send Institution Role`, `Send Name`, `Send Email`
   - **Configuration Settings** — set the **Tool Link URL** to `https://app.stupath.com/api/v1/lti/launch`
3. Add the deployment to the relevant Org Units (courses).

### 3. Provide Brightspace Details to StuPath

- `LTI_PLATFORM_URL` — `https://<your-brightspace-domain>`
- `LTI_CLIENT_ID` — from registration
- `LTI_DEPLOYMENT_ID` — from deployment
- `LTI_AUTH_ENDPOINT` — `https://auth.brightspace.com/d2l/lti/authenticate`
- `LTI_TOKEN_ENDPOINT` — `https://auth.brightspace.com/core/connect/token`
- `LTI_KEYSET_ENDPOINT` — `https://<your-brightspace-domain>/d2l/.well-known/jwks`

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **Launch fails with "state mismatch"** | Ensure cookies are allowed for third-party contexts. Canvas and Blackboard may require the `SameSite=None; Secure` cookie attribute. |
| **Grade passback returns 403** | Verify AGS scopes are enabled on both the LMS developer key and the StuPath deployment configuration. |
| **Roster sync is empty** | Confirm NRPS is enabled and the privacy settings share user names/emails with the tool. |
| **JWKS validation error** | Check that the Keyset URL is reachable from the LMS. Behind a firewall, add the LMS IP ranges to your allowlist. |
| **Deep link content not appearing** | Ensure the Deep Linking service is enabled and the placement type is set to `Deep Linking content tool`. |

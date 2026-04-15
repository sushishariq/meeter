# Meeter Full-Stack Implementation & Workflow Plan

To ensure my context window (memory/tokens) isn't exhausted and I maintain peak focus, we must treat this project as a series of **completely decoupled micro-projects**. 

## The Golden Rule for Our Workflow
1. **One Chunk per Session/Prompt**: Whenever you start a chunk, state your intention clearly (e.g., *"Let's execute Chunk 1"*).
2. **Commit and Close**: Once a chunk is working, we commit the code. If we move to a vastly different chunk (like moving from Backend APIs to Frontend CSS), it may even be beneficial to start a fresh chat with me, pointing me to the codebase to keep my memory light and focused *only* on the current files.
3. **Keep Files Modular**: I will write small, separate files (e.g., `routes.js`, `models.js`, `auth.js`) instead of one giant file. This allows me to read and edit only what I need.

---

## The Chunked Roadmap

I propose we use **Node.js/Express** for the backend and **MongoDB** for the database, as this pairs perfectly with the JSON-heavy logic your frontend currently uses.

> [!IMPORTANT]
> Let me know if you prefer a different stack (like Python/Django or PostgreSQL) before we begin!

### Chunk 1: Database & Server Initialization
**Goal:** Establish the foundational backend environment.
- Initialize the Node.js project.
- Install Express and Mongoose.
- Establish the MongoDB connection scheme.
- Plan and create the Database Schemas (`User` schema and `Meet` schema).
- *End of Chunk Check:* The server starts locally and connects to the DB successfully.

### Chunk 2: Secure Authentication
**Goal:** Replace the mock login with real Google SSO.
- Implement Passport.js with Google OAuth2 strategy.
- Enforce domain restriction (`@kgpian.iitkgp.ac.in`).
- Set up secure session cookies or JWT.
- Create `/auth/google` and `/auth/logout` endpoints.
- *End of Chunk Check:* You can click "Sign In" and authenticate using your KGP email, and a user document is created in the database.

### Chunk 3: The Matchmaking Engine
**Goal:** Port the client-side array logic into robust backend functions.
- Create utility functions to calculate interest overlap.
- Create functions to handle Squad building vs 1-on-1 building.
- Implement the "waiting queue" logic. We will use a lightweight cron-job scheduler (like `node-cron`) to evaluate the pool every few minutes rather than relying on active `setTimeout`.
- *End of Chunk Check:* We can manually trigger the matchmaking function using mock data in the DB to see if it perfectly assigns venues, times, and partners.

### Chunk 4: API Endpoints & Credits
**Goal:** Build the routes the frontend will actually talk to.
- Allow users to submit a meet request (Deducts 1 credit).
- Retrieve active meets and historical meets (`/meets/my-meets`).
- Endpoints to confirm attendance (Adds 1.5 credits if both confirm).
- *End of Chunk Check:* We can hit these endpoints using a tool like Postman or cURL and see the database update accurately.

### Chunk 5: Frontend Integration
**Goal:** Rip out the mock JavaScript arrays in `app.js` and wire up the UI.
- Replace `users` and `meetQueue` variables with `fetch()` calls to our new API.
- Update the UI based on server responses.
- Implement error handling (e.g., server says "Not enough credits").
- *End of Chunk Check:* The entire site works end-to-end locally.

### Chunk 6: Emails & Deployment Preparation
**Goal:** Finalize the remaining external integrations.
- Integrate an email service (like SendGrid or Nodemailer) for the match notifications.
- Hide all database passwords and API keys using `.env` variables securely.
- Prepare the repository for deployment (e.g., configuring scripts for Vercel/Render/Heroku).
- *End of Chunk Check:* The application is deployed live on a testing domain.

---

## Open Questions

1. **Tech Stack Confirmation**: Are you comfortable with me writing the backend using Node.js, Express, and MongoDB?
2. **Ready to Start?**: If you agree with the plan, reply with **"Approved, let's start Chunk 1."**

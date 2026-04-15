# Meeter — IIT Kharagpur

Meeter is an exclusive meetup and matchmaking platform designed purely for the students of IIT Kharagpur. The platform removes the endless loop of online chatting and gets straight to the point: matching you with like-minded KGPians and automatically scheduling a time and place to meet on campus.

## Overview

Meeter allows users to schedule a **1-on-1** meet or join a **Squad of 4**. The service maintains accountability through a unique credit-based economy that penalizes ghosting and rewards showing up.

---

## Features & Architecture

### 1. Exclusive Onboarding
- **Restricted Access**: The platform only accepts `@kgpian.iitkgp.ac.in` email IDs.
- **Anonymity First**: Users provide a nickname (real names are not required) alongside their age and gender. Matchmaking itself is strictly interest-based and gender-agnostic.

### 2. Matchmaking Logic
Users select up to **two interest tags** and choose whether they want a solo conversationalist or a squad. 
- **1-on-1**: The system searches the active queue for pending requests. 
  - It prioritizes matching both interests first, then falls back to a single shared interest.
  - If multiple potential matches share the same overlap score, the system breaks ties by selecting the user who has been waiting in the queue the longest.
  - If no compatible matches are found, the request sits in the queue (conceptually for 2 hours). If the timer exhausts, the system forces a **random** pairing.
- **Squad**: Follows an identical principle, assembling the three best available candidates from the queue with the highest overlaps.

### 3. Automated Scheduling & Venues
Once successfully paired, the system handles the logistics. Participants are presented with:
- **Nicknames** of their match(es).
- **Time**: A randomly assigned slot between **8:00 PM and 12:00 AM**.
- **Venue**: Assorted casually from popular campus spots (e.g., *New Tikka, Pepsi Cut, Gymkhana Lake, LLR Basketball courts, Sahara, Nalanda Subway side, Techmarket Front*, etc.).
- **Reminders**: The platform dispatches an AI-generated email reminder urging users to be punctual.

### 4. Credit Economy (Anti-Ghosting System)
To ensure people actually show up, Meeter employs a straightforward economy:
- Every new signup receives **3.0 credits**.
- Scheduling any meet deducts **1.0 credit**.
- Following a meet, users must log whether the other party arrived.
- If **both/all parties confirm attendance**, everyone involved receives a reward of **1.5 credits**. 
- If a user is marked as a no-show, they receive zero return tracking—essentially burning their spent credit.

---

## Project Structure

This project is currently designed as a robust client-side frontend prototype with mocked data states to demonstrate functionality:

- **`meeter.html`**: The unified Document Object Model. Houses the splash screens, authentication pages, tab navigations (Home, My Meets, Credits), and notification modals.
- **`styles.css`**: Powers the UI theme. Incorporates bold typography, dark palettes with glass/glow aesthetics, and responsive layout grids.
- **`app.js`**: Contains the client-side logic holding the application state:
  - Account and session management mock.
  - Priority queue algorithms comparing timestamps and tag arrays.
  - Confetti micro-animations.
  - Simulated AI email drafting functionality.

---

## Path to Full-Stack

To transition Meeter from a client-side prototype to a persistent, production-ready application, the following components must be built and integrated:

### 1. Database Layer
All states (users, meets, queues, and credits) currently live in browser memory. A relational (PostgreSQL) or document (MongoDB) database is required to:
- Persist user profiles and credit balances safely.
- Keep track of active meet schedules and historical meets.
- Support transactions to prevent race conditions during credit deductions and rewards.

### 2. Backend API Service
A dedicated backend (e.g., Node.js/Express, Python/FastAPI, or Go) is needed to handle business logic:
- REST or GraphQL endpoints for clients to request meets, log no-shows, and mutate profile data.
- Secure processing of the matchmaking algorithms away from the client-side.

### 3. Real Authentication & Authorization
Mocked passwords should be replaced with robust security:
- **Google Workspace SSO**: Implementing OAuth specifically filtering for the `@kgpian.iitkgp.ac.in` domain.
- **Session Management**: Adopting JWT (JSON Web Tokens) or secure HttpOnly cookies for session handling.

### 4. Background Workers & Job Queues
The current logic relies on `setTimeout` for the 2-hour matching threshold. In production:
- Implementing a message broker (like Redis + BullMQ, or Celery) to evaluate the queue continuously.
- Scheduled Cron jobs to reliably force matched/randomized groupings when the timeout exhausts.
- Background jobs to handle asynchronous tasks like dispatching emails securely using real services (e.g., SendGrid, AWS SES).

---

## Roadmap to Deployment

**Phase 1: Backend Architecture Setup**
- Design and initialize the database schema (Users, Meets, Transactions).
- Set up the server environment and scaffold the API endpoints.

**Phase 2: Authentication & Security Integration**
- Integrate Google OAuth for institutional emails.
- Establish secure session tokens and route guards.

**Phase 3: The Matchmaking Engine**
- Port the current client-side queue logic to the backend.
- Set up the background jobs and scheduling constraints using a message broker to evaluate overlaps and random matches at scale.

**Phase 4: Frontend Integration**
- Refactor `app.js` to replace mocked functions with asynchronous `fetch` calls to the new backend endpoints.
- Introduce loading states, skeleton screens, and real-time socket connections for immediate popup notifications.

**Phase 5: Staging & Testing**
- Develop unit tests for the matchmaking logic (ensuring overlapping tags and wait times behave deterministically).
- End-to-end (E2E) testing for the entire user flow.
- Deploy to a staging environment (e.g., Heroku, Render, AWS Elastic Beanstalk) for a localized beta test round.

**Phase 6: CI/CD & Production Launch**
- Containerize the application using Docker for consistency.
- Configure GitHub Actions for Continuous Integration.
- Deploy the database and server securely, wire up SSL domains, and conduct a full campus launch.

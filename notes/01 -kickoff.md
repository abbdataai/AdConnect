## 🚀 Project Kickoff Document: MKT WiFi Platform

**Base Meeting Date:** April 30, 2026

**System Language:** Brazilian Portuguese (pt-BR)

**Objective:** To develop a robust and scalable Wi-Fi marketing and Captive Portal management platform, enabling network monetization, lead capture, and centralized management of MikroTik equipment.

### **🛠️ Defined Technology Stack**
- Back-end: Python using FastAPI (high performance, static typing with Pydantic, excellent for asynchronous processing).

- Front-end (Administrative Panel and Captive Portal): React (componentization of the provided HTML layout, efficient state management).

- Database: PostgreSQL (relational, robust for storing connection logs, user data, and network telemetry).

- ORM (Data Mapping): SQLAlchemy with Alembic for database versioning in the backend.


### Entity Mapping

Based on the layout @notes/MKT WiFi - Full App.html, the API (FastAPI) will need to provide the following routes, and the Front-end (React) the following screens to manage the data.
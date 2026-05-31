# Smart Urban Traffic Management Platform

## Overview

A distributed web-service platform that provides intelligent urban traffic management through a GraphQL API Gateway. The system enables supervision of vehicles, real-time traffic density analysis, incident detection and tracking, role-based user authentication, and automated notifications all exposed through a unified GraphQL endpoint backed by independent microservices.

## Goals

1. Build a multi-service distributed architecture where each service owns its domain and data.
2. Expose all functionality through a single GraphQL API Gateway that aggregates and routes requests to the appropriate backend service.
3. Implement secure JWT-based authentication with role-based access control (ADMIN, OPERATOR).
4. Provide vehicle tracking with simulated GPS position recording and movement history.
5. Enable real-time traffic density measurement with zone congestion classification (Low / Medium / High).
6. Support the full incident lifecycle — declaration, status transitions (Reported → In Progress → Resolved), and classification by type (Accident, Construction, Road Closed, Traffic Jam).
7. Deliver push-style notifications with read/unread tracking.
8. Follow backend engineering best practices: data validation, error handling, relational database storage, and Git-based collaboration.

## Core User Flow

1. An administrator or operator registers an account and logs in to receive a JWT token.
2. The authenticated user adds one or more vehicles to the system, each linked to a traffic zone.
3. Each vehicle periodically emits simulated GPS position events that are recorded against its movement history.
4. The traffic service continuously measures vehicle density per zone and classifies congestion as Low, Medium, or High.
5. When density crosses a threshold or a user submits a report, an incident is created (Accident, Construction, Road Closed, or Traffic Jam) with an initial status of Reported.
6. An authorized operator updates the incident status to In Progress while responding, then to Resolved once handled.
7. Each incident state change and congestion alert triggers a notification sent to relevant users, who can view and mark notifications as read.

## Features

### Authentication
- User registration with email/password
- Secure login returning a signed JWT
- Role-based access control: ADMIN and OPERATOR
- Token-protected endpoints across all services

### Vehicle Management
- Register new vehicles (license plate, type, zone assignment)
- List all vehicles with filters
- View detailed vehicle information
- Record simulated GPS positions (latitude, longitude, timestamp)
- Query movement history for a given vehicle

### Traffic Management
- Define and manage traffic zones (geofences or named areas)
- Measure real-time vehicle density per zone
- Detect congested zones based on configurable thresholds
- Classify zones: Low / Medium / High congestion

### Incident Management
- Declare an incident (type, location, description, zone)
- List and filter incidents by status, type, or zone
- Transition incident status: Reported → In Progress → Resolved
- Incident types: Accident, Construction, Road Closed, Traffic Jam

### Notifications
- Send notifications triggered by incidents and congestion alerts
- List notifications for the authenticated user
- Mark individual notifications as read

## In Scope

- NestJS backend with TypeScript
- Five independent microservices: Authentication, Vehicles, Traffic, Incidents, Notifications
- GraphQL API Gateway as the single entry point
- PostgreSQL (or MySQL) relational database with per-service schema
- JWT-based authentication with role guards
- Input validation and structured error handling
- Git repository with full commit history
- README, UML diagrams, Postman collection, and sample GraphQL queries as deliverables
- Final presentation slide deck

## Out of Scope

- Physical IoT hardware or real GPS device integration
- Real-time WebSocket streaming (bonus, not required)
- Frontend dashboard or interactive map (bonus, not required)
- Mobile applications
- Third-party traffic data ingestion or external APIs
- CI/CD pipelines (bonus, not required)
- Production deployment or cloud hosting
- Unit or integration tests (bonus, not required)

## Success Criteria

- All five services start independently and communicate correctly through the GraphQL gateway.
- A user can register, log in, and receive a JWT that grants access to protected mutations/queries.
- Vehicles can be created and associated with zones; simulated GPS positions are stored and retrievable as a movement history.
- The traffic service computes zone density from vehicle positions and returns a correct congestion classification.
- Incidents can be created, listed, filtered, and transitioned through all three statuses.
- Notifications are generated on incident creation/update and can be listed and marked as read by the recipient.
- Every mutation and query includes proper validation errors for malformed input and authorization errors for unauthenticated or unauthorized requests.
- The Git repository shows coherent commit history from all team members.

# ReadMore API — Express + MongoDB (Mongoose)

In this project, I built a RESTful API for a bookstore called **ReadMore API** using **Node.js**, **Express.js**, **MongoDB**, and **Mongoose**. 

The system models two relational entities — **Authors** and **Books** — where one author can have many books, and every book belongs to an author. Beyond standard CRUD operations, I implemented custom business logic, dynamic filtering, sorting, pagination, data population, and strict validation rules.

---

## 📁 Project Architecture & Folder Structure

I organized the codebase following the Model-View-Controller (MVC) architectural pattern to ensure clean separation of concerns:

```
readmore-api/
├── .env.example         # Template for environment configuration
├── .gitignore           # Ignores node_modules, .env, and logs
├── package.json         # Project metadata and dependencies
├── server.js            # App entry point: DB connection and middleware
├── models/
│   ├── Author.js        # Mongoose schema and model for Author
│   └── Book.js          # Mongoose schema and model for Book (references Author)
├── controllers/
│   ├── authorController.js # Business logic for Author endpoints and stats
│   └── bookController.js   # Business logic for Book endpoints, filters, and validations
├── routes/
│   ├── authorRoutes.js  # Express router mapping /authors endpoints to controller functions
│   └── bookRoutes.js    # Express router mapping /books endpoints to controller functions
└── requests.http        # Comprehensive REST Client file to test all endpoints
```

- **Routes (`routes/`):** Only map HTTP methods and URL paths to corresponding controller functions.
- **Controllers (`controllers/`):** Contain the core business logic, query execution, data validation, and HTTP response handling.
- **Models (`models/`):** Define the Mongoose data schemas, field types, and inter-collection relationships.

---

## 🛠️ Step-by-Step Implementation Guide

In this section, I document how each part of the project is built and what you have to do in each step.

### Step 0: Project Setup & Database Connection
In this step, you have to set up the project environment and connect Express to MongoDB:
- Initialize the project with `npm init -y` and install `express`, `mongoose`, and `dotenv`.
- Create a `.env` file to store sensitive configuration like `PORT` and `MONGODB_URI` without exposing them in version control.
- In `server.js`, configure Mongoose to connect to the database first, and only start listening for incoming HTTP requests once the connection succeeds.
- Provide a root health-check endpoint (`GET /`) that confirms the API is live.
- Add route-not-found (`404`) middleware and a global error handling middleware to return clean JSON error messages.

### Step 1: Define the Data Models
In this step, you have to define the Mongoose schemas and models:
- **Author Model (`models/Author.js`):** Contains `name` (required, trimmed), `country` (required, trimmed), and `bio` (trimmed string).
- **Book Model (`models/Book.js`):** Contains `title` (required, trimmed), `genre` (required, trimmed), `price` (required number), `publishedYear` (required integer), and `author` (required `mongoose.Schema.Types.ObjectId` referencing the `Author` model).
- The `author` field creates the reference link that allows Mongoose to populate author information onto book queries.

### Step 2: Author CRUD Endpoints
In this step, you have to build the five core endpoints for authors mounted under `/authors`:
1. `POST /authors` — Creates a new author (`201 Created`). Validates that `name` and `country` are provided (`400 Bad Request` if missing).
2. `GET /authors` — Retrieves all authors from the database (`200 OK`).
3. `GET /authors/:id` — Retrieves a single author by ID. Returns `404 Not Found` if the author does not exist and `400 Bad Request` if the ID format is invalid.
4. `PUT /authors/:id` — Updates an existing author with `runValidators: true` (`200 OK`). Returns `404 Not Found` if the ID does not exist.
5. `DELETE /authors/:id` — Deletes an author (subject to the delete policy implemented in Step 4).
6. `GET /authors/:id/books` — Retrieves all books belonging to the specified author (`200 OK`).

### Step 3: Book CRUD Endpoints & Mongoose Population
In this step, you have to build the Book endpoints mounted under `/books`:
1. `POST /books` — Creates a new book linked to an author (`201 Created`).
2. `GET /books` — Retrieves all books, using `.populate('author')` to replace the raw author ObjectId with the full author document.
3. `GET /books/:id` — Retrieves a single book by ID with the author populated (`200 OK` or `404 Not Found`).
4. `PUT /books/:id` — Updates a book's details (`200 OK` or `404 Not Found`).
5. `DELETE /books/:id` — Deletes a book document (`200 OK` or `404 Not Found`).

---

## 🧠 Step 4: Business Rules & Critical Thinking

In this step, you have to enforce real-world business constraints in your controllers that the database schema cannot enforce automatically:

### 1. No Orphan Books (`HTTP 400 Bad Request`)
- **Reason:** In Mongoose, marking `author` as required only verifies that an `ObjectId` was provided in the request body. It does not check if an author with that ID actually exists in MongoDB.
- **My Implementation:** In `createBook` and `updateBook`, I query `Author.findById(author)`. If the author does not exist, the API rejects the operation with `400 Bad Request` and a clear message, ensuring no book can exist without a real author.

### 2. No Duplicate Titles per Author (`HTTP 409 Conflict`)
- **Reason:** An author should not have two books with the exact same title, and the comparison must be case-insensitive (`"the silent sea"` = `"The Silent Sea"`). However, two *different* authors are allowed to write books with the same title.
- **My Implementation:** When creating or updating a book, I execute a scoped query checking `{ author, title: { $regex: new RegExp('^' + escapedTitle + '$', 'i') } }`. If a book is found, the controller returns `409 Conflict`.

### 3. Rules the Schema Can't Express (`HTTP 422 Unprocessable Entity`)
- **Reason:** Standard Mongoose schemas don't handle dynamic date ranges or custom business thresholds out of the box.
- **My Implementation:**
  - If `price` is zero or negative (`price <= 0`), the request is rejected with `422 Unprocessable Entity`.
  - If `publishedYear` is earlier than `1450` (the advent of the modern printing press) or set in the future (`publishedYear > new Date().getFullYear()`), the request is rejected with `422 Unprocessable Entity`.

### 4. Author Deletion Policy (`Option A — Block Delete with HTTP 409`)
- **Problem:** Deleting an author who still has books in the store would leave orphan books pointing to a deleted author ID.
- **Why I Chose Option A (Block Delete):**
  - In a commercial bookstore or inventory management system, books represent physical inventory, warehouse stock, SKUs, sales records, and financial accounting items.
  - Silently deleting an author and cascading the deletion to all their books (**Option B**) would cause catastrophic and irreversible data loss.
  - Option A protects inventory integrity by blocking the deletion with `409 Conflict` and returning the count of associated books. The administrator must explicitly reassign or remove the books before the author can be deleted.
  - **Downside of Option A:** It requires extra manual operations from the client/admin when they deliberately want to delete an author and all their works.

### 5. Dynamic Search, Filtering, Sorting & Pagination
- **Dynamic Query Building:** `GET /books` checks query parameters dynamically and only applies filters that are present:
  - `genre`: Filters by book genre (case-insensitive).
  - `minPrice` & `maxPrice`: Range filtering (`$gte`, `$lte`).
  - `author`: Filters books by author ObjectId.
  - `search`: Substring search on book title using case-insensitive regular expressions.
  - `sort` & `order`: Sorts by `price`, `title`, `publishedYear`, or `createdAt` in `asc` or `desc` order.
- **Challenge — Pagination:** When `page` and `limit` are supplied, the endpoint returns:
  ```json
  {
    "total": 10,
    "page": 1,
    "limit": 5,
    "totalPages": 2,
    "results": [ ... ]
  }
  ```

### 6. Author Statistics (`GET /authors/:id/stats`)
- In this step, you calculate summary statistics from all books written by an author:
  ```json
  {
    "author": "Chinua Achebe",
    "bookCount": 3,
    "averagePrice": 24.5,
    "cheapestBook": "No Longer at Ease",
    "mostExpensiveBook": "Arrow of God"
  }
  ```
- **Handling Authors with Zero Books:** If an author has no books, the endpoint returns `200 OK` with sensible default values instead of crashing:
  ```json
  {
    "author": "Chimamanda Ngozi Adichie",
    "bookCount": 0,
    "averagePrice": 0,
    "cheapestBook": null,
    "mostExpensiveBook": null
  }
  ```

---

## 🚀 How to Run and Test the Project

### 1. Clone Your Fork
```bash
git clone https://github.com/attorney755/adv-backend-formative-II-readmore-api-project.git
cd adv-backend-formative-II-readmore-api-project
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Ensure your MongoDB connection string is configured in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/readmore_api
```

### 4. Start the Server
- Production mode:
  ```bash
  npm start
  ```
- Development mode (with auto-reload):
  ```bash
  npm run dev
  ```

### 5. Testing with REST Client
A full test suite is provided in [`requests.http`](file:///home/attorney/adv-backend-formative-II-readmore-api-project/requests.http).
You can install the **REST Client** extension in VS Code and click **Send Request** directly above each endpoint, or copy the requests into Postman or Insomnia.

---

## 📋 API Endpoints Reference Summary

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API Health Check | `200 OK` |
| `POST` | `/authors` | Create author | `201 Created` / `400 Bad Request` |
| `GET` | `/authors` | Get all authors | `200 OK` |
| `GET` | `/authors/:id` | Get author by ID | `200 OK` / `404 Not Found` / `400 Bad Request` |
| `PUT` | `/authors/:id` | Update author | `200 OK` / `404 Not Found` / `400 Bad Request` |
| `DELETE` | `/authors/:id` | Delete author (blocked if books exist) | `200 OK` / `409 Conflict` / `404 Not Found` |
| `GET` | `/authors/:id/books` | Get all books for an author | `200 OK` / `404 Not Found` |
| `GET` | `/authors/:id/stats` | Compute statistics for an author | `200 OK` / `404 Not Found` |
| `POST` | `/books` | Create book | `201 Created` / `400 Bad Request` / `409 Conflict` / `422 Unprocessable` |
| `GET` | `/books` | Get books (with filters, sort & pagination) | `200 OK` |
| `GET` | `/books/:id` | Get book by ID (populated author) | `200 OK` / `404 Not Found` |
| `PUT` | `/books/:id` | Update book | `200 OK` / `404 Not Found` / `409 Conflict` / `422 Unprocessable` |
| `DELETE` | `/books/:id` | Delete book | `200 OK` / `404 Not Found` |

# Company Task Management & Communication Dashboard

A full-stack task management and internal communication dashboard designed for companies and teams.  
The system enables admins, managers, and employees to collaborate efficiently through tasks, notifications, departments, and role-based permissions.

---

## 🚀 Project Overview

This dashboard allows:
- Creating and managing tasks between team members
- Assigning tasks with mentions and notifications
- Tracking task progress (Start → In Progress → Completed)
- Managing users, admins, roles, and permissions
- Organizing work by departments
- Viewing analytics, activity logs, and uploaded files

The system is built with a **React + TailwindCSS frontend** and a **Laravel (PHP) backend**, using **JWT authentication**.

---

## 🧱 Tech Stack

### Frontend
- React.js
- JavaScript
- HTML5 / CSS3
- TailwindCSS
- Responsive Design
- Skeleton Loading

### Backend
- PHP
- Laravel
- RESTful APIs
- JWT Authentication
- WebSockets / Laravel Echo (Notifications)

### Database
- MySQL

---

## 👥 User Roles

### Admin
- Full access to all features
- Manage users, admins, roles, permissions
- View and manage all tasks
- View all notifications and activity logs
- Access system analytics and reports

### Manager
- Create and assign tasks
- Manage tasks within their department
- Upload attachments
- Track task progress

### Employee
- View assigned tasks
- Update task status
- Upload attachments
- Receive notifications and mentions

---

## 📄 Pages & Features

### 🔐 Authentication
- **Login Page**
- **Register Page**
- Secure authentication using JWT

---

### 📊 Dashboard (Home Page)
- Overview analytics:
  - Total tasks
  - Tasks in Start
  - Tasks In Progress
  - Completed tasks
- Performance charts
- Visible based on user role

---

### ✅ Task Management Page
- Create tasks with:
  - Title & description
  - Assignees (single or multiple)
  - Mentions (@user)
  - Attachments (images / PDFs)
- Task statuses:
  - Start
  - In Progress
  - Completed
- Move tasks between statuses (buttons or drag & drop)
- Edit and delete tasks (by creator)
- Completion confirmation sends notification to task creator

---

### 🔔 Notifications Center
- Task assigned notifications
- Task completed notifications
- Mentions notifications
- Role and admin actions
- Notification badge in navbar
- Notifications persist until marked as read

---

### 🏢 Departments Page
- Create, edit, and delete departments
- View tasks by department
- Assign users to departments
- Each department opens its own task view

---

### 👤 Profile Page
- Edit name and email
- Change password
- Upload profile image
- View personal tasks
- Basic performance analytics

---

### 🗂️ Global File Manager
- View all uploaded files:
  - Images
  - PDFs
  - Attachments
- Search and filter by:
  - User
  - Task
  - Department
- Admin-only delete & management actions
- Visible to all users (read-only for non-admins)

---

### 🛡️ Roles & Permissions
- Create roles with custom permissions
- Assign permissions to roles
- Edit or delete roles
- Assign roles to users and admins

---

### 👨‍💼 Admin Management
- Create, edit, and delete admins
- Assign roles and permissions
- Unique email validation
- Full CRUD operations

---

### 👥 User Management
- View all users
- Create new users
- Edit user information
- Change user passwords
- Delete users (permanently)

---

### 🧾 Activity Log
- Tracks all system actions:
  - Task creation, update, completion
  - User creation and deletion
  - Role and permission changes
- Timestamped and ordered

---

### 🌗 Dark / Light Mode
- Global dark and light theme
- Works across all dashboard pages
- User preference preserved

---

## ⚙️ How to Run the Project

### Backend (Laravel)

# Install dependencies
composer install

# Create environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Configure database in .env

# Run migrations
php artisan migrate

# Start server
php artisan serve


### Front-End (React Js)

# Install dependencies
npm install

# Start development server
npm run dev

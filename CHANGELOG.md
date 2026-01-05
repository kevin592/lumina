# Changelog

All notable changes to Lumina will be documented in this file.

## [Unreleased]

### Added - OKR & Task Management System 🎯

#### Features
- **Unified Dashboard Interface**
  - Single page to manage all Objectives, Key Results, and Tasks
  - View all goals, progress, and tasks at a glance
  - Statistics cards showing: total objectives, active KRs, in-progress tasks, overall progress

- **Accordion-style Display**
  - Expandable/collapsible OKR cards for clean organization
  - Nested KR accordion items within each OKR
  - Smooth animations for expand/collapse actions

- **Responsive Design**
  - Desktop: Two-column layout with sidebar navigation
  - Mobile: Tab-based view switcher (OKR / Daily Tasks / All Tasks)
  - Adaptive layouts for tablets (768px - 1024px)

- **Quick Task Creation**
  - Global quick-add task input in header
  - Inline task creation for each OKR and KR
  - Natural language task parsing support

- **Task Management**
  - Priority levels: URGENT, HIGH, MEDIUM, LOW
  - Status tracking: PENDING, IN_PROGRESS, COMPLETED, CANCELLED, BLOCKED
  - Due date support
  - Task completion animations
  - Batch operations (delete multiple tasks, update status)

- **Keyboard Shortcuts**
  - `Ctrl+N` - Quick add task
  - `Ctrl+O` - Create OKR
  - `Ctrl+K` - Search
  - `Ctrl+Shift+O` - Switch to OKR view
  - `Ctrl+Shift+D` - Switch to daily tasks view
  - `Ctrl+Shift+A` - Switch to all tasks view

- **Loading & Empty States**
  - Skeleton screens for loading indicators
  - Friendly empty state messages with action buttons
  - Visual feedback for all user interactions

- **Sidebar Navigation**
  - Quick switching between OKRs
  - View switcher (OKR / Daily Tasks / All Tasks)
  - Visual selection state (highlighted background, bold border)

#### Components
- `DashboardLayout` - Main layout container
- `DashboardStatsCard` - Statistics display
- `OKRAccordionItem` - OKR card with expand/collapse
- `KRAccordionItem` - KR card with expand/collapse
- `InlineTaskList` - Compact task list component
- `QuickTaskInput` - Fast task creation input
- `OKRSidebar` - Navigation sidebar
- `CreateObjectiveDialog` - OKR creation dialog
- `CreateKRDialog` - KR creation dialog
- `CreateTaskDialog` - Detailed task creation dialog
- `EditTaskDialog` - Task editing dialog
- `EmptyState` - Empty state display
- `Skeleton` - Loading skeleton components
- `KeyboardShortcuts` - Shortcut help dialog
- `BatchActions` - Batch operations toolbar

#### API Routes
- `objectiveRoutes` - CRUD operations for Objectives
- `keyResultRoutes` - CRUD operations for Key Results
- `taskRoutes` - CRUD operations for Tasks

#### Database Schema
- `Objective` model - Stores OKR objectives
- `KeyResult` model - Stores key results linked to objectives
- `Task` model - Stores tasks linked to objectives/key results

#### Internationalization
- Added 20+ translation keys for OKR features
- Support for Chinese and English languages

#### Optimizations
- Optimistic updates for better UX (accordion state preserved)
- Lazy loading for KR data
- Efficient state management with MobX
- CSS transitions for smooth animations

### Changed
- Updated main navigation to show "目标与任务" (Goals & Tasks) instead of separate entries
- Old OKR and task list pages now redirect to new dashboard
- Unified dialog styling across all OKR components

### Removed
- Removed unused `CreateOKRDialog` component (replaced by `CreateObjectiveDialog`)
- Removed old `list.tsx`, `detail.tsx`, `tasks.tsx` pages (functionality merged into dashboard)

---

## Previous Releases

For older releases, please check the git history.

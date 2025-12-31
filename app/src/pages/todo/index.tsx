import { useState, useMemo, useEffect, useRef } from 'react';

import { observer } from 'mobx-react-lite';

import { LuminaStore } from '@/store/luminaStore';

import { RootStore } from '@/store';

import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Common/Iconify/icons';

import { ScrollArea } from '@/components/Common/ScrollArea';

import { LoadingAndEmpty } from '@/components/Common/LoadingAndEmpty';

import dayjs from '@/lib/dayjs';

import type { Note } from '@shared/lib/types';

import { NoteType } from '@shared/lib/types';

import { getTodoReminderManager } from '@/utils/todoReminder';

import { TodoContextMenu } from '@/components/TodoContextMenu';



type FilterType = 'all' | 'today' | 'week' | 'completed' | 'unscheduled' | 'overdue';



interface TodoGroup {

  id: number;

  name: string;

  color: string;

  icon: string;

}



// 智能识别日期和优先级（新格式：@时间 !优先级）

const parseTodoInput = (input: string) => {

  const result = {

    content: input,

    dueDate: null as string | null,

    dueTime: null as string | null,

    priority: 0 as number,

  };



  if (!input) return result;



  let processContent = result.content;



  // 1. 识别优先级（支持中文标点），匹配 !4, p4、P4

  const priorityPatterns = [

    { regex: /[!！]4|p4|P4|urgent|紧急/, priority: 4 },

    { regex: /[!！]3|p3|P3|high|高/, priority: 3 },

    { regex: /[!！]2|p2|P2|medium|中/, priority: 2 },

    { regex: /[!！]1|p1|P1|low|低/, priority: 1 },

  ];



  for (const pattern of priorityPatterns) {

    const match = processContent.match(pattern.regex);

    if (match) {

      result.priority = pattern.priority;

      processContent = processContent.replace(match[0], '').trim();

      break;

    }

  }



  // 2. 识别时间（@格式，支持中文标点和空格）
  // 匹配 @今天 8点、@今天8点、@12-25、@12/25、@12-25 12:30

  const timePatterns = [

    // @今天 8点、@明天 8点、@后天 8点（支持空格）
    {

      regex: /[@]今天\s*(\d{1,2})[点时](\d{2})?/,

      handler: (match: RegExpMatchArray) => {

        const hour = parseInt(match[1]);

        const minute = match[2] ? parseInt(match[2]) : 0;

        const date = dayjs().hour(hour).minute(minute);

        return date.format('YYYY-MM-DD HH:mm');

      }

    },

    {

      regex: /[@]明天\s*(\d{1,2})[点时](\d{2})?/,

      handler: (match: RegExpMatchArray) => {

        const hour = parseInt(match[1]);

        const minute = match[2] ? parseInt(match[2]) : 0;

        const date = dayjs().add(1, 'day').hour(hour).minute(minute);

        return date.format('YYYY-MM-DD HH:mm');

      }

    },

    {

      regex: /[@]后天\s*(\d{1,2})[点时](\d{2})?/,

      handler: (match: RegExpMatchArray) => {

        const hour = parseInt(match[1]);

        const minute = match[2] ? parseInt(match[2]) : 0;

        const date = dayjs().add(2, 'day').hour(hour).minute(minute);

        return date.format('YYYY-MM-DD HH:mm');

      }

    },

    // @12-25 12:30 或 @12/25 12:30

    {

      regex: /[@](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,

      handler: (match: RegExpMatchArray) => {

        const now = dayjs();

        const month = parseInt(match[1]);

        const day = parseInt(match[2]);

        const hour = match[3] ? parseInt(match[3]) : 8;

        const minute = match[4] ? parseInt(match[4]) : 0;

        const date = now.month(month - 1).date(day).hour(hour).minute(minute);

        return date.format('YYYY-MM-DD HH:mm');

      }

    },

    // @2024-12-25 12:30

    {

      regex: /[@](\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,

      handler: (match: RegExpMatchArray) => {

        const year = parseInt(match[1]);

        const month = parseInt(match[2]);

        const day = parseInt(match[3]);

        const hour = match[4] ? parseInt(match[4]) : 8;

        const minute = match[5] ? parseInt(match[5]) : 0;

        const date = dayjs().year(year).month(month - 1).date(day).hour(hour).minute(minute);

        return date.format('YYYY-MM-DD HH:mm');

      }

    },

    // @今天、@明天、@后天

    { regex: /[@]今天/, date: dayjs().format('YYYY-MM-DD') },

    { regex: /[@]明天/, date: dayjs().add(1, 'day').format('YYYY-MM-DD') },

    { regex: /[@]后天/, date: dayjs().add(2, 'day').format('YYYY-MM-DD') },

    { regex: /[@]大后天/, date: dayjs().add(3, 'day').format('YYYY-MM-DD') },

    // @12-25 或 @12/25

    {

      regex: /[@](\d{1,2})[-/](\d{1,2})/,

      handler: (match: RegExpMatchArray) => {

        const now = dayjs();

        const month = parseInt(match[1]);

        const day = parseInt(match[2]);

        const date = now.month(month - 1).date(day);

        return date.format('YYYY-MM-DD');

      }

    },

    // @2024-12-25

    {

      regex: /[@](\d{4})[-/](\d{1,2})[-/](\d{1,2})/,

      handler: (match: RegExpMatchArray) => {

        const year = parseInt(match[1]);

        const month = parseInt(match[2]);

        const day = parseInt(match[3]);

        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      }

    },

  ];



  for (const pattern of timePatterns) {

    const match = processContent.match(pattern.regex);

    if (match) {

      if (pattern.handler) {

        result.dueDate = (pattern as any).handler(match);

      } else if ((pattern as any).date) {

        result.dueDate = (pattern as any).date;

      }

      processContent = processContent.replace(match[0], '').trim();

      break;

    }

  }



  result.content = processContent;

  return result;

};



// 分组配置

const ALL_TAB_SECTIONS = [

  { id: 'today' as const, name: '今天', icon: 'ri-calendar-smile-line' },

  { id: 'tomorrow' as const, name: '明天', icon: 'ri-calendar-todo-line' },

  { id: 'week' as const, name: '本周', icon: 'ri-calendar-line' },

  { id: 'completed' as const, name: '已完成', icon: 'ri-checkbox-circle-line' },

];



const TodoPage = observer(() => {

  const { t } = useTranslation();

  const Lumina = RootStore.Get(LuminaStore);

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const [selectedTodo, setSelectedTodo] = useState<Note | null>(null);



  // 右键菜单状态
  const [contextMenuTodo, setContextMenuTodo] = useState<Note | null>(null);

  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);



  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');



  // 排序状态
  const [sortOption, setSortOption] = useState<'priority-desc' | 'priority-asc' | 'date-asc' | 'date-desc' | 'created-desc' | 'created-asc'>('priority-desc');



  // 添加任务相关状态
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);



  // 编辑状态
  const [isEditingContent, setIsEditingContent] = useState(false);

  const [editingContent, setEditingContent] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);



  // 优先级和截止时间编辑状态
  const [isEditingPriority, setIsEditingPriority] = useState(false);

  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  const [editingPriority, setEditingPriority] = useState(0);

  const [editingDueDate, setEditingDueDate] = useState('');

  const dueDateInputRef = useRef<HTMLInputElement>(null);



  // 子任务状态
  const [subtasks, setSubtasks] = useState<Array<{ id: number; content: string; completed: boolean; expireAt: string | null }>>([]);

  const [newSubtaskContent, setNewSubtaskContent] = useState('');

  const [newSubtaskExpireAt, setNewSubtaskExpireAt] = useState('');

  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const subtaskExpireRef = useRef<HTMLInputElement>(null);



  // 任务列表展开状态
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());



  // 快速添加子任务状态
  const [quickAddSubtaskId, setQuickAddSubtaskId] = useState<number | null>(null);

  const [quickAddSubtaskContent, setQuickAddSubtaskContent] = useState('');

  const quickAddInputRef = useRef<HTMLInputElement>(null);



  // 子任务编辑状态
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);

  const [editingSubtaskContent, setEditingSubtaskContent] = useState('');

  const subtaskEditInputRef = useRef<HTMLInputElement>(null);



  // 任务列表中的任务标题编辑状态
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [editingTaskContent, setEditingTaskContent] = useState('');

  const taskEditInputRef = useRef<HTMLInputElement>(null);



  // 批量操作状态
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<number>>(new Set());

  const isBatchMode = selectedTodoIds.size > 0;



  // 展开/折叠状态 - 使用强制更新确保渲染

  const [expandedSections, setExpandedSections] = useState({

    today: true,

    tomorrow: true,

    week: false,

    completed: false

  });

  const [, forceUpdate] = useState({});



  // 每个分组显示的最大任务数

  const MAX_DISPLAY_COUNT = 5;



  // 初始化数据
  useEffect(() => {

    Lumina.noteListFilterConfig.type = NoteType.TODO;

    Lumina.noteListFilterConfig.isArchived = false;

    Lumina.noteListFilterConfig.isRecycle = false;

    Lumina.todoList.resetAndCall({});



    // 启动任务到期提醒

    const reminderManager = getTodoReminderManager(Lumina);

    reminderManager.start();



    // 组件卸载时停止提醒
    return () => {

      reminderManager.stop();

    };

  }, []);



  // 请求浏览器通知权限

  useEffect(() => {

    const requestNotificationPermission = async () => {

      const reminderManager = getTodoReminderManager(Lumina);

      await reminderManager.requestPermission();

    };



    // 用户首次交互时请求通知权限

    const handleUserInteraction = () => {

      requestNotificationPermission();

      document.removeEventListener('click', handleUserInteraction);

    };



    document.addEventListener('click', handleUserInteraction);

    return () => document.removeEventListener('click', handleUserInteraction);

  }, []);



  // 快捷键支持
  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {

      const isInputFocused =

        inputRef.current === document.activeElement ||

        taskEditInputRef.current === document.activeElement ||

        editInputRef.current === document.activeElement ||

        quickAddInputRef.current === document.activeElement;



      // 如果在输入框中，不处理快捷键（除了 Escape）
      if (isInputFocused) {

        if (e.key === 'Escape') {

          setInputValue('');

          setEditingTaskId(null);

          setEditingTaskContent('');

          setIsEditingContent(false);

          setQuickAddSubtaskId(null);

          setQuickAddSubtaskContent('');

        }

        return;

      }



      // Ctrl/Cmd + N: 新建任务

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {

        e.preventDefault();

        inputRef.current?.focus();

        return;

      }



      // Ctrl/Cmd + F: 搜索任务

      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {

        e.preventDefault();

        // 可以添加搜索功能的实现
        return;

      }



      // Ctrl/Cmd + A: 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {

        e.preventDefault();

        selectAllTodos();

        return;

      }



      // Escape: 退出批量模式或关闭详情

      if (e.key === 'Escape') {

        if (isBatchMode) {

          setSelectedTodoIds(new Set());

        } else if (selectedTodo) {

          setSelectedTodo(null);

        }

        return;

      }



      // Ctrl/Cmd + D: 删除选中的任务
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedTodoIds.size > 0) {

        e.preventDefault();

        handleBatchDelete();

        return;

      }



      // Ctrl/Cmd + Enter: 完成选中的任务
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selectedTodoIds.size > 0) {

        e.preventDefault();

        handleBatchComplete();

        return;

      }

    };



    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);

  }, [selectedTodoIds.size, selectedTodo]);



  // 点击外部自动关闭输入框
  useEffect(() => {

    const handleClickOutside = (e: MouseEvent) => {

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {

        if (!inputValue.trim()) {

          setInputValue('');

        }

      }

    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [inputValue]);



  // 获取待办列表

  const allTodos = useMemo(() => {

    return Lumina.todoList?.value || [];

  }, [Lumina.todoList?.value, Lumina.updateTicker]);



  // 任务统计

  const todoStatistics = useMemo(() => {

    const now = dayjs();

    const todayStart = now.startOf('day');

    const todayEnd = now.endOf('day');

    const weekStart = now.startOf('week').add(1, 'day'); // 周一

    const weekEnd = now.endOf('week').add(1, 'day'); // 周日



    const todayTodos = allTodos.filter(t => {

      const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;

      return completedAt && completedAt.isAfter(todayStart) && completedAt.isBefore(todayEnd);

    });



    const weekTodos = allTodos.filter(t => {

      const completedAt = t.metadata?.completedAt ? dayjs(t.metadata.completedAt) : null;

      return completedAt && completedAt.isAfter(weekStart) && completedAt.isBefore(weekEnd);

    });



    const overdueCount = allTodos.filter(t => {

      if (t.metadata?.todoStatus === 'completed') return false;

      if (!t.metadata?.expireAt) return false;

      return dayjs(t.metadata.expireAt).isBefore(now, 'day');

    }).length;



    const todayTasks = allTodos.filter(t => {

      const isDueToday = t.metadata?.expireAt && dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === now.format('YYYY-MM-DD');

      return isDueToday;

    });



    const todayCompletedCount = todayTasks.filter(t => t.metadata?.todoStatus === 'completed').length;



    return {

      total: allTodos.length,

      pending: allTodos.filter(t => t.metadata?.todoStatus !== 'completed').length,

      completed: allTodos.filter(t => t.metadata?.todoStatus === 'completed').length,

      overdue: overdueCount,

      todayCompleted: todayTodos.length,

      weekCompleted: weekTodos.length,

      todayCompletedRate: todayTasks.length > 0 ? Math.round((todayCompletedCount / todayTasks.length) * 100) : 0,

      highPriority: allTodos.filter(t => t.metadata?.todoPriority === 4 && t.metadata?.todoStatus !== 'completed').length,

      mediumPriority: allTodos.filter(t => t.metadata?.todoPriority === 3 && t.metadata?.todoStatus !== 'completed').length,

      lowPriority: allTodos.filter(t => t.metadata?.todoPriority === 2 && t.metadata?.todoStatus !== 'completed').length,

    };

  }, [allTodos, Lumina.updateTicker]);



  // 按日期分组的任务列表（用于全部tabs）
  const groupedTodos = useMemo(() => {

    const now = dayjs();

    const today = now.format('YYYY-MM-DD');

    const tomorrow = now.add(1, 'day').format('YYYY-MM-DD');

    const weekEnd = now.add(7, 'day').endOf('day');



    return {

      today: allTodos.filter(t => {

        if (t.metadata?.todoStatus === 'completed') return false;

        if (!t.metadata?.expireAt) return false;

        return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === today;

      }),

      tomorrow: allTodos.filter(t => {

        if (t.metadata?.todoStatus === 'completed') return false;

        if (!t.metadata?.expireAt) return false;

        return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === tomorrow;

      }),

      week: allTodos.filter(t => {

        if (t.metadata?.todoStatus === 'completed') return false;

        if (!t.metadata?.expireAt) return false;

        const expireDate = dayjs(t.metadata.expireAt);

        return expireDate.isAfter(now.add(1, 'day').startOf('day')) && expireDate.isBefore(weekEnd);

      }),

      completed: allTodos.filter(t => t.metadata?.todoStatus === 'completed')

    };

  }, [allTodos]);



  // 根据选择的筛选条件获取任务（用于非全部tabs）
  const filteredTodos = useMemo(() => {

    const now = dayjs();

    const today = now.format('YYYY-MM-DD');

    const weekEnd = now.add(7, 'day').endOf('day');



    switch (selectedFilter) {

      case 'all':

        return allTodos.filter(t => t.metadata?.todoStatus !== 'completed');

      case 'today':

        return allTodos.filter(t => {

          if (t.metadata?.todoStatus === 'completed') return false;

          if (!t.metadata?.expireAt) return false;

          return dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === today;

        });

      case 'week':

        return allTodos.filter(t => {

          if (t.metadata?.todoStatus === 'completed') return false;

          if (!t.metadata?.expireAt) return false;

          const expireDate = dayjs(t.metadata.expireAt);

          return expireDate.isAfter(now) && expireDate.isBefore(weekEnd);

        });

      case 'completed':

        return allTodos.filter(t => t.metadata?.todoStatus === 'completed');

      case 'unscheduled':

        return allTodos.filter(t => !t.metadata?.expireAt && t.metadata?.todoStatus !== 'completed');

      case 'overdue':

        return allTodos.filter(t => {

          if (t.metadata?.todoStatus === 'completed') return false;

          if (!t.metadata?.expireAt) return false;

          return dayjs(t.metadata.expireAt).isBefore(now, 'day');

        });

      default:

        return allTodos;

    }

  }, [allTodos, selectedFilter]);



  // 应用搜索过滤

  const searchedTodos = useMemo(() => {

    if (!searchQuery.trim()) {

      return filteredTodos;

    }

    const query = searchQuery.toLowerCase();

    return filteredTodos.filter(t =>

      t.content?.toLowerCase().includes(query)

    );

  }, [filteredTodos, searchQuery]);



  // 按优先级和日期排序的辅助函数

  const sortTodos = (todos: Note[]) => {

    return [...todos].sort((a, b) => {

      switch (sortOption) {

        case 'priority-desc':

          const priorityA = a.metadata?.todoPriority ?? 0;

          const priorityB = b.metadata?.todoPriority ?? 0;

          if (priorityA !== priorityB) {

            return priorityB - priorityA;

          }

          const dateA1 = a.metadata?.expireAt ? new Date(a.metadata.expireAt).getTime() : 0;

          const dateB1 = b.metadata?.expireAt ? new Date(b.metadata.expireAt).getTime() : 0;

          return dateA1 - dateB1;



        case 'priority-asc':

          const priorityA2 = a.metadata?.todoPriority ?? 0;

          const priorityB2 = b.metadata?.todoPriority ?? 0;

          if (priorityA2 !== priorityB2) {

            return priorityA2 - priorityB2;

          }

          const dateA2 = a.metadata?.expireAt ? new Date(a.metadata.expireAt).getTime() : 0;

          const dateB2 = b.metadata?.expireAt ? new Date(b.metadata.expireAt).getTime() : 0;

          return dateA2 - dateB2;



        case 'date-asc':

          const dateA3 = a.metadata?.expireAt ? new Date(a.metadata.expireAt).getTime() : Number.MAX_SAFE_INTEGER;

          const dateB3 = b.metadata?.expireAt ? new Date(b.metadata.expireAt).getTime() : Number.MAX_SAFE_INTEGER;

          if (dateA3 !== dateB3) {

            return dateA3 - dateB3;

          }

          const priorityA3 = a.metadata?.todoPriority ?? 0;

          const priorityB3 = b.metadata?.todoPriority ?? 0;

          return priorityB3 - priorityA3;



        case 'date-desc':

          const dateA4 = a.metadata?.expireAt ? new Date(a.metadata.expireAt).getTime() : 0;

          const dateB4 = b.metadata?.expireAt ? new Date(b.metadata.expireAt).getTime() : 0;

          if (dateA4 !== dateB4) {

            return dateB4 - dateA4;

          }

          const priorityA4 = a.metadata?.todoPriority ?? 0;

          const priorityB4 = b.metadata?.todoPriority ?? 0;

          return priorityB4 - priorityA4;



        case 'created-desc':

          const createdA5 = a.createdAt ? new Date(a.createdAt).getTime() : 0;

          const createdB5 = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return createdB5 - createdA5;



        case 'created-asc':

          const createdA6 = a.createdAt ? new Date(a.createdAt).getTime() : 0;

          const createdB6 = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          return createdA6 - createdB6;



        default:

          return 0;

      }

    });

  };



  // 应用排序

  const sortedTodos = useMemo(() => {

    return sortTodos(searchedTodos);

  }, [searchedTodos, sortOption]);



  // 切换分组的展开/折叠状态 - 使用函数式更新确保获取最新状态
  const handleToggleSection = (sectionId: 'today' | 'tomorrow' | 'week' | 'completed') => {

    console.log('Before toggle - section:', sectionId, 'current expandedSections:', expandedSections);

    setExpandedSections((prev) => {

      const newValue = !prev[sectionId];

      const newState = { ...prev, [sectionId]: newValue };

      console.log('After toggle - section:', sectionId, 'new expandedSections:', newState);

      // 强制更新组件

      setTimeout(() => forceUpdate({}), 0);

      return newState;

    });

  };



  // 添加任务

  const handleAddTodo = async () => {

    if (!inputValue.trim()) return;



    const parsed = parseTodoInput(inputValue);



    await Lumina.upsertNote.call({

      content: parsed.content,

      type: NoteType.TODO,

      metadata: {

        todoStatus: 'pending',

        todoPriority: parsed.priority,

        expireAt: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : null,

      },

      refresh: true,

      showToast: true

    });



    // 清空输入但保持添加状态
    setInputValue('');

  };



  // 切换完成状态
  const handleToggleComplete = async (todo: Note, e: React.MouseEvent) => {

    e.stopPropagation();

    try {

      const isCompleted = todo.metadata?.todoStatus === 'completed';

      const newStatus = isCompleted ? 'pending' : 'completed';

      const now = new Date().toISOString();



      // 乐观更新：立即更新 UI

      const currentTodos = Lumina.todoList.value || [];

      const optimisticTodos = currentTodos.map(t =>

        t.id === todo.id

          ? {

            ...t,

            metadata: {

              ...t.metadata,

              todoStatus: newStatus,

              completedAt: newStatus === 'completed' ? now : null,

              subtasks: t.metadata?.subtasks?.map((st: any) => ({

                ...st,

                completed: newStatus === 'completed',

                todoStatus: newStatus,

                completedAt: newStatus === 'completed' ? now : null

              }))

            }

          }

          : t

      );



      // 临时更新显示

      Lumina.todoList.value = optimisticTodos;



      // 准备更新的 metadata

      let updatedMetadata = { ...todo.metadata };

      if (newStatus === 'completed' && todo.metadata?.subtasks) {

        updatedMetadata.subtasks = todo.metadata.subtasks.map((st: any) => ({

          ...st,

          completed: true,

          todoStatus: 'completed',

          completedAt: now

        }));

      } else if (newStatus === 'pending' && todo.metadata?.subtasks) {

        updatedMetadata.subtasks = todo.metadata.subtasks.map((st: any) => ({

          ...st,

          completed: false,

          todoStatus: 'pending',

          completedAt: null

        }));

      }



      // 实际提交到服务器

      await Lumina.upsertNote.call({

        id: todo.id,

        content: todo.content,

        type: todo.type,

        metadata: {

          ...updatedMetadata,

          todoStatus: newStatus,

          completedAt: newStatus === 'completed' ? now : null

        },

        refresh: true, // 成功后重新加载确保数据一致
        showToast: false

      });

    } catch (error) {

      // 失败时回滚
      console.error('Failed to toggle todo status:', error);

      await Lumina.todoList.resetAndCall({});

    }

  };



  // 删除任务

  const handleDeleteTodo = async (todo: Note) => {

    // 确认提示，显示子任务数量

    const subtaskCount = todo.metadata?.subtasks?.length || 0;

    const confirmed = window.confirm(

      `确定要删除任务"${todo.content}"吗？${subtaskCount > 0 ? `\n包含 ${subtaskCount} 个子任务` : ''}`

    );

    if (!confirmed) return;



    try {

      // 级联删除所有子任务（metadata.subtasks 中的 ID）
      if (subtaskCount > 0) {

        for (const subtask of todo.metadata.subtasks) {

          await Lumina.upsertNote.call({

            id: subtask.id,

            isRecycle: true,

            refresh: false,

            showToast: false

          });

        }

      }



      // 删除父任务
      await Lumina.upsertNote.call({

        id: todo.id,

        content: todo.content,

        type: todo.type,

        isRecycle: true,

        refresh: true,

        showToast: true

      });



      // 关闭详情面板

      if (selectedTodo?.id === todo.id) {

        setSelectedTodo(null);

      }

    } catch (error) {

      console.error('Failed to delete todo:', error);

    }

  };



  // 批量操作函数

  const toggleTodoSelection = (todoId: number) => {

    setSelectedTodoIds(prev => {

      const newSet = new Set(prev);

      if (newSet.has(todoId)) {

        newSet.delete(todoId);

      } else {

        newSet.add(todoId);

      }

      return newSet;

    });

  };



  const toggleSectionSelection = (sectionId: 'today' | 'tomorrow' | 'week' | 'completed') => {

    const sectionTodos = groupedTodos[sectionId] || [];

    const sectionTodoIds = new Set(sectionTodos.map(t => t.id));

    const allSelected = sectionTodos.length > 0 && sectionTodoIds.size > 0 &&

      Array.from(selectedTodoIds).filter(id => sectionTodoIds.has(id)).length === sectionTodoIds.size;



    if (allSelected) {

      // 取消选择该分组的所有任务
      setSelectedTodoIds(prev => {

        const newSet = new Set(prev);

        sectionTodoIds.forEach(id => newSet.delete(id));

        return newSet;

      });

    } else {

      // 选择该分组的所有任务
      setSelectedTodoIds(prev => {

        const newSet = new Set(prev);

        sectionTodoIds.forEach(id => newSet.add(id));

        return newSet;

      });

    }

  };



  const selectAllTodos = () => {

    if (selectedTodoIds.size === searchedTodos.length) {

      setSelectedTodoIds(new Set());

    } else {

      setSelectedTodoIds(new Set(searchedTodos.map(t => t.id)));

    }

  };



  const handleBatchComplete = async () => {

    if (selectedTodoIds.size === 0) return;



    try {

      const now = new Date().toISOString();

      for (const id of selectedTodoIds) {

        const todo = searchedTodos.find(t => t.id === id);

        if (todo && todo.metadata?.todoStatus !== 'completed') {

          await Lumina.upsertNote.call({

            id,

            content: todo.content,

            type: todo.type,

            metadata: {

              ...todo.metadata,

              todoStatus: 'completed',

              completedAt: now

            },

            refresh: false,

            showToast: false

          });

        }

      }

      Lumina.updateTicker++;

      setSelectedTodoIds(new Set());

    } catch (error) {

      console.error('批量完成失败:', error);

    }

  };



  const handleBatchUncomplete = async () => {

    if (selectedTodoIds.size === 0) return;



    try {

      for (const id of selectedTodoIds) {

        const todo = searchedTodos.find(t => t.id === id);

        if (todo && todo.metadata?.todoStatus === 'completed') {

          await Lumina.upsertNote.call({

            id,

            content: todo.content,

            type: todo.type,

            metadata: {

              ...todo.metadata,

              todoStatus: 'pending',

              completedAt: null

            },

            refresh: false,

            showToast: false

          });

        }

      }

      Lumina.updateTicker++;

      setSelectedTodoIds(new Set());

    } catch (error) {

      console.error('批量取消完成失败:', error);

    }

  };



  const handleBatchDelete = async () => {

    if (selectedTodoIds.size === 0) return;



    const confirmed = window.confirm(`确定要删除选中的 ${selectedTodoIds.size} 个任务吗？`);

    if (!confirmed) return;



    try {

      for (const id of selectedTodoIds) {

        const todo = searchedTodos.find(t => t.id === id);

        if (todo) {

          // 级联删除子任务
          if (todo.metadata?.subtasks?.length > 0) {

            for (const subtask of todo.metadata.subtasks) {

              await Lumina.upsertNote.call({

                id: subtask.id,

                isRecycle: true,

                refresh: false,

                showToast: false

              });

            }

          }

          // 删除父任务
          await Lumina.upsertNote.call({

            id,

            isRecycle: true,

            refresh: false,

            showToast: false

          });

        }

      }

      Lumina.updateTicker++;

      setSelectedTodoIds(new Set());

      if (selectedTodo && selectedTodoIds.has(selectedTodo.id)) {

        setSelectedTodo(null);

      }

    } catch (error) {

      console.error('批量删除失败:', error);

    }

  };



  // 开始编辑任务内容
  const handleStartEditContent = (todo: Note) => {

    setEditingContent(todo.content);

    setIsEditingContent(true);

    setTimeout(() => editInputRef.current?.focus(), 0);

  };



  // 保存编辑的任务内容
  const handleSaveEditContent = async () => {

    if (!selectedTodo || !editingContent.trim()) return;

    try {

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: editingContent.trim(),

        type: selectedTodo.type,

        metadata: selectedTodo.metadata,

        refresh: false,

        showToast: false

      });

      setIsEditingContent(false);

    } catch (error) {

      console.error('Failed to update todo content:', error);

    }

  };



  // 取消编辑

  const handleCancelEditContent = () => {

    setIsEditingContent(false);

    setEditingContent('');

  };



  // 开始编辑优先级

  const handleStartEditPriority = (todo: Note) => {

    setEditingPriority(todo.metadata?.todoPriority ?? 0);

    setIsEditingPriority(true);

  };



  // 保存优先级
  const handleSavePriority = async () => {

    if (!selectedTodo) return;

    try {

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: selectedTodo.content,

        type: selectedTodo.type,

        metadata: {

          ...selectedTodo.metadata,

          todoPriority: editingPriority,

        },

        refresh: false,

        showToast: false

      });

      setIsEditingPriority(false);

    } catch (error) {

      console.error('Failed to update priority:', error);

    }

  };



  // 开始编辑截止时间
  const handleStartEditDueDate = (todo: Note) => {

    setEditingDueDate(todo.metadata?.expireAt ? dayjs(todo.metadata.expireAt).format('YYYY-MM-DDTHH:mm') : '');

    setIsEditingDueDate(true);

    setTimeout(() => dueDateInputRef.current?.focus(), 0);

  };



  // 保存截止时间

  const handleSaveDueDate = async () => {

    if (!selectedTodo) return;

    try {

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: selectedTodo.content,

        type: selectedTodo.type,

        metadata: {

          ...selectedTodo.metadata,

          expireAt: editingDueDate ? new Date(editingDueDate).toISOString() : null,

        },

        refresh: false,

        showToast: false

      });

      setIsEditingDueDate(false);

    } catch (error) {

      console.error('Failed to update due date:', error);

    }

  };



  // 添加子任务
  const handleAddSubtask = async () => {

    if (!selectedTodo || !newSubtaskContent.trim()) return;

    const newId = Date.now();

    const newSubtask = {

      id: newId,

      content: newSubtaskContent.trim(),

      completed: false,

      expireAt: newSubtaskExpireAt ? new Date(newSubtaskExpireAt).toISOString() : null

    };

    setSubtasks([...subtasks, newSubtask]);

    setNewSubtaskContent('');

    setNewSubtaskExpireAt('');



    // 保存到服务器

    try {

      const currentSubtasks = selectedTodo.metadata?.subtasks || [];

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: selectedTodo.content,

        type: selectedTodo.type,

        metadata: {

          ...selectedTodo.metadata,

          subtasks: [...currentSubtasks, newSubtask],

        },

        refresh: false,

        showToast: false

      });

    } catch (error) {

      console.error('Failed to add subtask:', error);

    }

  };



  // 切换子任务完成状态
  const handleToggleSubtask = async (subtaskId: number) => {

    if (!selectedTodo) return;

    const updatedSubtasks = subtasks.map(st =>

      st.id === subtaskId ? { ...st, completed: !st.completed } : st

    );

    setSubtasks(updatedSubtasks);



    try {

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: selectedTodo.content,

        type: selectedTodo.type,

        metadata: {

          ...selectedTodo.metadata,

          subtasks: updatedSubtasks,

        },

        refresh: false,

        showToast: false

      });

    } catch (error) {

      console.error('Failed to toggle subtask:', error);

    }

  };



  // 切换任务展开/折叠

  const handleToggleTaskExpand = (taskId: number) => {

    setExpandedTaskIds(prev => {

      const newSet = new Set(prev);

      if (newSet.has(taskId)) {

        newSet.delete(taskId);

      } else {

        newSet.add(taskId);

      }

      return newSet;

    });

  };



  // 切换任务列表中的子任务状态
  const handleToggleListSubtask = async (parentTodo: Note, subtaskId: number) => {

    const currentSubtasks = parentTodo.metadata?.subtasks || [];

    const updatedSubtasks = currentSubtasks.map((st: any) =>

      st.id === subtaskId ? { ...st, completed: !st.completed } : st

    );



    try {

      await Lumina.upsertNote.call({

        id: parentTodo.id,

        content: parentTodo.content,

        type: parentTodo.type,

        metadata: {

          ...parentTodo.metadata,

          subtasks: updatedSubtasks,

        },

        refresh: false,

        showToast: false

      });

    } catch (error) {

      console.error('Failed to toggle subtask:', error);

    }

  };



  // 开始快速添加子任务

  const handleStartQuickAddSubtask = (todoId: number) => {

    setQuickAddSubtaskId(todoId);

    setQuickAddSubtaskContent('');

    setTimeout(() => quickAddInputRef.current?.focus(), 0);

  };



  // 快速添加子任务

  const handleQuickAddSubtask = async (parentTodo: Note) => {

    if (!quickAddSubtaskContent.trim()) return;



    // 使用相同的解析逻辑

    const parsed = parseTodoInput(quickAddSubtaskContent);

    const newId = Date.now();

    const newSubtask = {

      id: newId,

      content: parsed.content,

      completed: false,

      expireAt: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : null,

      priority: parsed.priority

    };



    const currentSubtasks = parentTodo.metadata?.subtasks || [];



    try {

      await Lumina.upsertNote.call({

        id: parentTodo.id,

        content: parentTodo.content,

        type: parentTodo.type,

        metadata: {

          ...parentTodo.metadata,

          subtasks: [...currentSubtasks, newSubtask],

        },

        refresh: false,

        showToast: false

      });

      setQuickAddSubtaskId(null);

      setQuickAddSubtaskContent('');

    } catch (error) {

      console.error('Failed to add subtask:', error);

    }

  };



  // 开始编辑子任务

  const handleStartEditSubtask = (subtask: any) => {

    setEditingSubtaskId(subtask.id);

    setEditingSubtaskContent(subtask.content);

    setTimeout(() => subtaskEditInputRef.current?.focus(), 0);

  };



  // 保存子任务编辑
  const handleSaveSubtaskEdit = async (parentTodo: Note) => {

    if (!editingSubtaskContent.trim()) return;



    // 获取最新的父任务数据
    const latestParentTodo = Lumina.todoList.value?.find(t => t.id === parentTodo.id) ?? parentTodo;

    const currentSubtasks = latestParentTodo.metadata?.subtasks || [];

    const updatedSubtasks = currentSubtasks.map((st: any) =>

      st.id === editingSubtaskId ? { ...st, content: editingSubtaskContent.trim() } : st

    );



    try {

      await Lumina.upsertNote.call({

        id: parentTodo.id,

        content: latestParentTodo.content,

        type: latestParentTodo.type,

        metadata: {

          ...latestParentTodo.metadata,

          subtasks: updatedSubtasks,

        },

        refresh: false,

        showToast: false

      });

      setEditingSubtaskId(null);

      setEditingSubtaskContent('');

    } catch (error) {

      console.error('Failed to update subtask:', error);

    }

  };



  // 开始编辑任务标题（在列表中）
  const handleStartEditTask = (todo: Note) => {

    setEditingTaskId(todo.id);

    setEditingTaskContent(todo.content);

    setTimeout(() => taskEditInputRef.current?.focus(), 0);

  };



  // 保存任务标题编辑

  const handleSaveTaskEdit = async (todo: Note) => {

    if (!editingTaskContent.trim()) return;



    try {

      // 获取最新的任务数据以避免覆盖其他操作的更新

      const latestTodo = Lumina.todoList.value?.find(t => t.id === todo.id);



      await Lumina.upsertNote.call({

        id: todo.id,

        content: editingTaskContent.trim(),

        type: todo.type,

        metadata: latestTodo?.metadata ?? todo.metadata, // 使用最新的 metadata

        refresh: false,

        showToast: false

      });

      setEditingTaskId(null);

      setEditingTaskContent('');

    } catch (error) {

      console.error('Failed to update task:', error);

    }

  };



  // 删除子任务
  const handleDeleteSubtask = async (subtaskId: number) => {

    if (!selectedTodo) return;

    const updatedSubtasks = subtasks.filter(st => st.id !== subtaskId);

    setSubtasks(updatedSubtasks);



    try {

      await Lumina.upsertNote.call({

        id: selectedTodo.id,

        content: selectedTodo.content,

        type: selectedTodo.type,

        metadata: {

          ...selectedTodo.metadata,

          subtasks: updatedSubtasks,

        },

        refresh: false,

        showToast: false

      });

    } catch (error) {

      console.error('Failed to delete subtask:', error);

    }

  };



  // 加载子任务
  useEffect(() => {

    if (selectedTodo?.metadata?.subtasks) {

      setSubtasks(selectedTodo.metadata.subtasks);

    } else {

      setSubtasks([]);

    }

  }, [selectedTodo]);



  // 格式化截止日期（蓝色显示）
  const formatDueDate = (todo: Note) => {

    if (!todo.metadata?.expireAt) return null;

    const date = dayjs(todo.metadata.expireAt);

    const now = dayjs();

    const diffDays = date.diff(now, 'day');



    // 检查是否包含时间部分
    const hasTime = date.hour() > 0 || date.minute() > 0;

    const timeStr = hasTime ? ` ${date.format('HH:mm')}` : '';



    if (diffDays < 0) return { text: `逾期 ${Math.abs(diffDays)} 天${timeStr}`, color: 'text-blue-500' };

    if (diffDays === 0) return { text: `今天${timeStr}`, color: 'text-blue-500' };

    if (diffDays === 1) return { text: `明天${timeStr}`, color: 'text-blue-500' };

    if (diffDays === 2) return { text: `后天${timeStr}`, color: 'text-blue-500' };

    return { text: date.format(`MM月DD日${timeStr}`), color: 'text-blue-500' };

  };



  // 获取优先级文字颜色（用于标题）
  const getPriorityTextColor = (priority: number) => {

    const colors = [

      'text-default-700', // 0: 无优先级 - 黑色

      'text-blue-500',     // 1: 低优先级 - 蓝色

      'text-yellow-500',   // 2: 中优先级 - 黄色

      'text-orange-500',   // 3: 高优先级 - 橙色

      'text-red-500',      // 4: 紧?- 红色

    ];

    return colors[priority] || colors[0];

  };



  // Design v2.0 - 侧边栏配置（使用 RemixIcon 与原型一致）

  const sidebarSections = {

    smart: [

      { id: 'all' as FilterType, name: t('all') || '全部', icon: 'ri-inbox-archive-line' },

      { id: 'today' as FilterType, name: t('today') || '今天', icon: 'ri-sun-line' },

      { id: 'week' as FilterType, name: '最近7天', icon: 'ri-calendar-event-line' },

    ],

    filters: [

      { id: 'unscheduled' as FilterType, name: '未安排', icon: 'ri-time-line' },

      { id: 'overdue' as FilterType, name: '已逾期', icon: 'ri-alarm-warning-line' },

      { id: 'completed' as FilterType, name: '已完成', icon: 'ri-checkbox-circle-line' },

    ]

  };



  // 渲染单个任务 (Apple Style)

  const renderTodoItem = (todo: Note, index: number, total: number) => {

    const isCompleted = todo.metadata?.todoStatus === 'completed';

    const priority = todo.metadata?.todoPriority ?? 0;

    // const dueDate = formatDueDate(todo);



    const isEditingTask = editingTaskId === todo.id;

    const islast = index === total - 1;



    // 获取优先级颜色圆点
    const getPriorityDotColor = (p: number) => {

      if (p === 1) return 'bg-blue-500'; // Low

      if (p === 2) return 'bg-yellow-500'; // Medium

      if (p === 3) return 'bg-orange-500'; // High

      if (p === 4) return 'bg-red-500'; // Urgent

      return 'bg-blue-500'; // Default

    };



    return (

      <div key={todo.id} className="relative group">

        <div

          className={`

            flex items-center gap-3 py-3 px-2 transition-colors 

            ${!islast ? 'border-b border-gray-100' : ''}

            ${selectedTodo?.id === todo.id

              ? 'bg-blue-50/60'

              : isBatchMode && selectedTodoIds.has(todo.id)

                ? 'bg-blue-100'

                : 'hover:bg-gray-50/80'

            }

          `}

        >

          {/* Circular Checkbox (Apple Style) */}

          <div

            onClick={(e) => {

              e.stopPropagation();

              handleToggleComplete(todo, e as any);

            }}

            className="flex-shrink-0 cursor-pointer pt-0.5"

          >

            <div className={`

               w-5 h-5 rounded-full border-[1.5px] transition-all flex items-center justify-center

               ${isCompleted

                ? 'bg-blue-500 border-blue-500'

                : `bg-transparent border-gray-300 group-hover:border-blue-400`

              }

             `}>

              {isCompleted && <i className="ri-check-line text-white text-xs font-bold" />}

            </div>

          </div>



          {/* Content Area */}

          <div

            className="flex-1 min-w-0"

            onClick={() => {

              if (isBatchMode) {

                toggleTodoSelection(todo.id);

              } else if (!isEditingTask) {

                handleStartEditTask(todo);

              }

            }}

          >

            {isEditingTask ? (

              <input

                ref={taskEditInputRef}

                type="text"

                value={editingTaskContent}

                onChange={(e) => setEditingTaskContent(e.target.value)}

                onKeyDown={(e) => {

                  if (e.key === 'Enter') handleSaveTaskEdit(todo);

                  if (e.key === 'Escape') {

                    setEditingTaskId(null);

                    setEditingTaskContent('');

                  }

                }}

                onBlur={() => handleSaveTaskEdit(todo)}

                className="w-full text-[15px] text-gray-900 bg-transparent border-none p-0 focus:ring-0"

                autoFocus

                onClick={(e) => e.stopPropagation()}

              />

            ) : (

              <div className="flex flex-col gap-0.5">

                <div className={`text-[15px] leading-snug transition-colors ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'

                  }`}>

                  {priority > 0 && !isCompleted && (

                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 mb-0.5 ${getPriorityDotColor(priority)}`}></span>

                  )}

                  {todo.content}

                </div>



                {/* Meta Info Line (Due Date, Prio, etc) */}

                <div className="flex items-center gap-2 h-4">

                  {todo.metadata?.expireAt && (

                    <span className={`text-xs ${dayjs(todo.metadata.expireAt).isBefore(dayjs(), 'day') && !isCompleted

                      ? 'text-red-500 font-medium'

                      : 'text-gray-400'

                      }`}>

                      {dayjs(todo.metadata.expireAt).format('MM-DD HH:mm')}

                    </span>

                  )}

                </div>

              </div>

            )}

          </div>



          {/* Action Buttons (Hover only) */}

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">

            <button

              onClick={(e) => {

                e.stopPropagation();

                setContextMenuTodo(todo);

                setContextMenuPosition({ x: e.clientX, y: e.clientY });

              }}

              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"

            >

              <i className="ri-more-2-fill"></i>

            </button>

          </div>

        </div>

      </div>

    );

  };



  // 渲染列表视图（非全部tab）
  const renderListView = () => {

    if (sortedTodos.length === 0) {

      return (

        <div className="p-3 text-center text-default-400">

          <p className="text-sm">暂无任务</p>

        </div>

      );

    }

    return (

      <div className="p-3">

        {sortedTodos.map((todo, index) => renderTodoItem(todo, index, sortedTodos.length))}

      </div>

    );

  };

  // 添加调试日志

  console.log('TodoPage render - allTodos:', allTodos.length, 'sortedTodos:', sortedTodos.length, 'expandedSections:', expandedSections);



  return (

    <div className="flex h-full w-full bg-[#f5f5f7] select-none font-sans overflow-hidden relative">

      {/* Background Gradient Layer - Subtle "Atmosphere" */}

      <div className="absolute inset-0 pointer-events-none"

        style={{

          background: 'radial-gradient(circle at 0% 0%, #eef2ff 0%, transparent 40%), radial-gradient(circle at 100% 100%, #f0fdf4 0%, transparent 40%)'

        }}

      />



      {/* Main App Window Container (Simulating a window on desktop if needed, or just filling space comfortably) */}

      <div className="flex-1 flex h-full z-10 relative">



        {/* 左侧边栏 - Glassmorphism Sidebar */}

        <div className="w-[260px] flex-shrink-0 flex flex-col pt-6 pb-4 bg-white/70 backdrop-blur-xl border-r border-black/[0.04]">

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 px-4">

            {/* Design v2.0 - 智能清单 */}

            <div>

              <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 opacity-80">Smart Lists</h3>

              <nav className="space-y-1">

                {sidebarSections.smart.map(item => {

                  const count = allTodos.filter(t => {

                    if (item.id === 'all') return t.metadata?.todoStatus !== 'completed';

                    if (item.id === 'today') {

                      return t.metadata?.todoStatus !== 'completed' &&

                        t.metadata?.expireAt &&

                        dayjs(t.metadata.expireAt).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');

                    }

                    if (item.id === 'week') {

                      const now = dayjs();

                      const weekEnd = now.add(7, 'day').endOf('day');

                      return t.metadata?.todoStatus !== 'completed' &&

                        t.metadata?.expireAt &&

                        dayjs(t.metadata.expireAt).isAfter(now) &&

                        dayjs(t.metadata.expireAt).isBefore(weekEnd);

                    }

                    return false;

                  }).length;



                  const isActive = selectedFilter === item.id;



                  // Apple Style Icons

                  const getIconColor = () => {

                    if (item.id === 'all') return 'text-gray-500';

                    if (item.id === 'today') return 'text-blue-500';

                    if (item.id === 'week') return 'text-red-500';

                    return 'text-gray-500';

                  };



                  return (

                    <button

                      key={item.id}

                      onClick={() => setSelectedFilter(item.id)}

                      className={`

                        w-full flex items-center justify-between px-3 py-1.5 text-[13px] font-medium transition-all rounded-lg group relative

                        ${isActive

                          ? 'bg-black/[0.06] text-gray-900 shadow-sm'

                          : 'text-gray-600 hover:bg-black/[0.03]'

                        }

                      `}

                    >

                      <div className="flex items-center gap-3">

                        <i className={`${item.icon} ${getIconColor()} text-lg`}></i>

                        <span className="tracking-tight">{item.name}</span>

                      </div>

                      {count > 0 && (

                        <span className={`text-xs font-medium tabular-nums ${isActive ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`}>

                          {count}

                        </span>

                      )}

                    </button>

                  );

                })}

              </nav>

            </div>



            {/* Design v2.0 - 过滤?*/}

            <div>

              <h3 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 opacity-80">Lists</h3>

              <nav className="space-y-1">

                {sidebarSections.filters.map(item => {

                  const count = allTodos.filter(t => {

                    if (item.id === 'unscheduled') return !t.metadata?.expireAt && t.metadata?.todoStatus !== 'completed';

                    if (item.id === 'overdue') {

                      return t.metadata?.todoStatus !== 'completed' &&

                        t.metadata?.expireAt &&

                        dayjs(t.metadata.expireAt).isBefore(dayjs(), 'day');

                    }

                    if (item.id === 'completed') return t.metadata?.todoStatus === 'completed';

                    return false;

                  }).length;



                  const isActive = selectedFilter === item.id;



                  const getIconColor = () => {

                    if (item.id === 'unscheduled') return 'text-orange-400';

                    if (item.id === 'overdue') return 'text-red-500';

                    if (item.id === 'completed') return 'text-gray-400';

                    return 'text-gray-400';

                  };



                  return (

                    <button

                      key={item.id}

                      onClick={() => setSelectedFilter(item.id)}

                      className={`

                        w-full flex items-center justify-between px-3 py-1.5 text-[13px] font-medium transition-all rounded-lg group

                        ${isActive

                          ? 'bg-black/[0.06] text-gray-900 shadow-sm'

                          : 'text-gray-600 hover:bg-black/[0.03]'

                        }

                      `}

                    >

                      <div className="flex items-center gap-3">

                        <i className={`${item.icon} ${getIconColor()} text-lg`}></i>

                        <span className="tracking-tight">{item.name}</span>

                      </div>

                      {count > 0 && (

                        <span className={`text-xs font-medium tabular-nums ${isActive ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-500'}`}>

                          {count}

                        </span>

                      )}

                    </button>

                  );

                })}

              </nav>

            </div>

          </div>



          {/* Sidebar Footer info or settings could go here */}

        </div>



        {/* 右侧内容?- Clean White Sheet with subtle separation */}

        <div className="flex-1 h-full flex flex-col bg-white overflow-hidden relative shadow-[-1px_0_20px_0_rgba(0,0,0,0.02)] z-20">



          {/* 顶部标题?& 搜索 */}

          <div className="flex-shrink-0 px-8 py-6 pb-2">

            <div className="flex items-center justify-between mb-4">

              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">

                {sidebarSections.smart.find(i => i.id === selectedFilter)?.name ||

                  sidebarSections.filters.find(i => i.id === selectedFilter)?.name ||

                  '全部'}

              </h1>



              {/* 排序与操?*/}

              <div className="flex items-center gap-2">

                {isBatchMode && (

                  <div className="flex items-center gap-2 mr-4 bg-blue-50 px-3 py-1 rounded-full">

                    <span className="text-xs text-blue-600 font-medium">{selectedTodoIds.size} 已选中</span>

                    <button onClick={handleBatchComplete} className="p-1 hover:bg-blue-100 rounded-full text-blue-600" title="完成"><i className="ri-check-line"></i></button>

                    <button onClick={handleBatchDelete} className="p-1 hover:bg-red-100 rounded-full text-red-600" title="删除"><i className="ri-delete-bin-line"></i></button>

                    <button onClick={() => setSelectedTodoIds(new Set())} className="p-1 hover:bg-blue-100 rounded-full text-gray-500" title="取消"><i className="ri-close-line"></i></button>

                  </div>

                )}



                <div className="relative group">

                  <select

                    value={sortOption}

                    onChange={(e) => setSortOption(e.target.value as any)}

                    className="appearance-none bg-transparent pl-2 pr-6 py-1 text-sm font-medium text-blue-500 cursor-pointer focus:outline-none"

                  >

                    <option value="priority-desc">优先级降序</option>

                    <option value="date-asc">日期</option>

                    <option value="created-desc">创建时间</option>

                  </select>

                  <i className="ri-arrow-down-s-line absolute right-1 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none text-xs"></i>

                </div>

              </div>

            </div>



            {/* 快速添加 - 极简风格 */}

            <div className="relative group">

              <i className="ri-add-line absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors text-xl"></i>

              <input

                ref={inputRef}

                type="text"

                value={inputValue}

                onChange={(e) => setInputValue(e.target.value)}

                onKeyDown={(e) => {

                  if (e.key === 'Enter' && !e.shiftKey) {

                    e.preventDefault();

                    handleAddTodo();

                  }

                }}

                placeholder="添加新任务..."

                className="w-full pl-8 py-2 bg-transparent border-b border-gray-100 text-base focus:border-blue-500 focus:outline-none transition-all placeholder-gray-400"

              />

            </div>

          </div>



          {/* 任务列表区域 */}

          <div className="flex-1 overflow-hidden px-8">

            <LoadingAndEmpty

              isLoading={Lumina.todoList?.isLoading}

              isEmpty={!Lumina.todoList?.isLoading && sortedTodos.length === 0}

            />



            {!Lumina.todoList?.isLoading && (

              <ScrollArea

                className="h-full pr-4"

                onRefresh={async () => {

                  await Lumina.todoList.resetAndCall({});

                }}

              >

                {selectedFilter === 'all' ? (

                  <div className="space-y-8 pb-10">

                    {ALL_TAB_SECTIONS.map(section => {

                      const todos = sortTodos(groupedTodos[section.id]);

                      const isExpanded = expandedSections[section.id];



                      if (todos.length === 0) return null;



                      return (

                        <div key={section.id}>

                          <div

                            className="flex items-center gap-2 mb-2 group cursor-pointer"

                            onClick={() => handleToggleSection(section.id)}

                          >

                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">

                              {section.name}

                              <span className="text-sm font-normal text-gray-400 ml-2">{todos.length}</span>

                            </h2>

                            <i className={`ri-arrow-down-s-line text-gray-300 transition-transform ${!isExpanded ? '-rotate-90' : ''}`}></i>

                          </div>



                          {isExpanded && (

                            <div className="space-y-0">

                              {todos.map((todo, index) => renderTodoItem(todo, index, todos.length))}

                            </div>

                          )}

                        </div>

                      );

                    })}

                  </div>

                ) : (

                  <div className="space-y-0 pb-10">

                    {/* 搜索框（仅在非全部视图或其他需要时显示，这里为了保持简洁可能先隐藏或集成到顶部） */}



                    {sortedTodos.map((todo, index) => renderTodoItem(todo, index, sortedTodos.length))}

                  </div>

                )}

              </ScrollArea>

            )}

          </div>

        </div>



        {/* 右键菜单 */}

        <TodoContextMenu

          todo={contextMenuTodo}

          position={contextMenuPosition}

          onClose={() => {

            setContextMenuTodo(null);

            setContextMenuPosition(null);

          }}

          onToggleComplete={(todo) => {

            handleToggleComplete(todo, {} as any);

          }}

          onDelete={handleDeleteTodo}

          onEdit={(todo) => {

            setSelectedTodo(todo);

          }}

          onAddSubtask={(todo) => {

            setSelectedTodo(todo);

            setQuickAddSubtaskId(todo.id);

          }}

        />

      </div>

    </div>

  );

});



export default TodoPage;


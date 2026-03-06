import axios from 'axios'

export type Role = 'user' | 'admin'

export interface AuthToken {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  is_completed: boolean
  owner_id: number
  created_at: string
  updated_at: string
}

export interface ApiErrorPayload {
  error?: {
    message?: string
  }
}

export interface RegisterPayload {
  email: string
  full_name: string
  password: string
}

export interface TaskPayload {
  title: string
  description?: string
  is_completed?: boolean
}

const TOKEN_KEY = 'assignment_access_token'

export const getAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const register = async (payload: RegisterPayload): Promise<User> => {
  const { data } = await api.post<User>('/auth/register', payload)
  return data
}

export const login = async (email: string, password: string): Promise<AuthToken> => {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)

  const { data } = await api.post<AuthToken>('/auth/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export const listTasks = async (allTasks = false): Promise<Task[]> => {
  const { data } = await api.get<Task[]>('/tasks', {
    params: { all_tasks: allTasks },
  })
  return data
}

export const createTask = async (payload: TaskPayload): Promise<Task> => {
  const { data } = await api.post<Task>('/tasks', payload)
  return data
}

export const updateTask = async (taskId: number, payload: TaskPayload): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${taskId}`, payload)
  return data
}

export const deleteTask = async (taskId: number): Promise<void> => {
  await api.delete(`/tasks/${taskId}`)
}

export const listUsers = async (): Promise<User[]> => {
  const { data } = await api.get<User[]>('/users')
  return data
}

export const updateUserRole = async (userId: number, role: Role): Promise<User> => {
  const { data } = await api.patch<User>(`/users/${userId}/role`, { role })
  return data
}

export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined
    if (payload?.error?.message) {
      return payload.error.message
    }

    if (typeof error.response?.data?.detail === 'string') {
      return error.response.data.detail
    }

    if (error.message) {
      return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unexpected error occurred.'
}

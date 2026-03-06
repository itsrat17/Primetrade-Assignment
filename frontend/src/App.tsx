import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  clearAccessToken,
  createTask,
  deleteTask,
  extractErrorMessage,
  getAccessToken,
  getCurrentUser,
  listTasks,
  listUsers,
  login,
  register,
  setAccessToken,
  updateTask,
  updateUserRole,
} from '@/lib/api'
import type { Role, Task } from '@/lib/api'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

type AuthMode = 'login' | 'register'
type FlashMessage = { type: 'success' | 'error'; message: string } | null

function App() {
  const queryClient = useQueryClient()

  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [flash, setFlash] = useState<FlashMessage>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const [showAllTasks, setShowAllTasks] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCompleted, setEditCompleted] = useState(false)

  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    retry: false,
  })

  const isAdmin = meQuery.data?.role === 'admin'

  const tasksQuery = useQuery({
    queryKey: ['tasks', showAllTasks],
    queryFn: () => listTasks(showAllTasks && isAdmin),
    enabled: Boolean(token) && Boolean(meQuery.data),
  })

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
    enabled: Boolean(token) && isAdmin,
  })

  useEffect(() => {
    if (!meQuery.isError) {
      return
    }

    clearAccessToken()
    setToken(null)
    setFlash({ type: 'error', message: 'Session expired. Please log in again.' })
  }, [meQuery.isError])

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (user) => {
      setFlash({
        type: 'success',
        message: `Registration complete for ${user.email}. You can log in now.`,
      })
      setAuthMode('login')
      setPassword('')
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const loginMutation = useMutation({
    mutationFn: ({ userEmail, userPassword }: { userEmail: string; userPassword: string }) =>
      login(userEmail, userPassword),
    onSuccess: (data) => {
      setAccessToken(data.access_token)
      setToken(data.access_token)
      setFlash({ type: 'success', message: 'Logged in successfully.' })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      setPassword('')
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Task created.' })
      setNewTitle('')
      setNewDescription('')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: number; payload: Parameters<typeof updateTask>[1] }) =>
      updateTask(taskId, payload),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Task updated.' })
      setEditingTask(null)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Task deleted.' })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) => updateUserRole(userId, role),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'User role updated.' })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (error) => {
      setFlash({ type: 'error', message: extractErrorMessage(error) })
    },
  })

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFlash(null)

    if (authMode === 'register') {
      registerMutation.mutate({
        email,
        full_name: fullName,
        password,
      })
      return
    }

    loginMutation.mutate({ userEmail: email, userPassword: password })
  }

  const handleCreateTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    createTaskMutation.mutate({
      title: newTitle,
      description: newDescription,
      is_completed: false,
    })
  }

  const handleLogout = () => {
    clearAccessToken()
    setToken(null)
    setShowAllTasks(false)
    queryClient.removeQueries()
    setFlash({ type: 'success', message: 'Logged out.' })
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description ?? '')
    setEditCompleted(task.is_completed)
  }

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTask) {
      return
    }

    updateTaskMutation.mutate({
      taskId: editingTask.id,
      payload: {
        title: editTitle,
        description: editDescription,
        is_completed: editCompleted,
      },
    })
  }

  const taskStats = useMemo(() => {
    const tasks = tasksQuery.data ?? []
    const completed = tasks.filter((task) => task.is_completed).length
    return { total: tasks.length, completed, open: tasks.length - completed }
  }, [tasksQuery.data])

  const isAuthLoading = registerMutation.isPending || loginMutation.isPending
  const isDashboardLoading = meQuery.isLoading || tasksQuery.isLoading

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-100 p-4 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Scalable REST API Assignment</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            FastAPI + PostgreSQL + OAuth2/JWT + RBAC + React + TanStack Query + shadcn/ui
          </p>
        </div>

        {flash && (
          <Alert variant={flash.type === 'error' ? 'destructive' : 'default'}>
            <AlertTitle>{flash.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
            <AlertDescription>{flash.message}</AlertDescription>
          </Alert>
        )}

        {!token ? (
          <Card className="mx-auto max-w-xl border-slate-200/80 shadow-lg">
            <CardHeader>
              <CardTitle>{authMode === 'login' ? 'Login' : 'Register'}</CardTitle>
              <CardDescription>
                {authMode === 'login'
                  ? 'Log in using email as username (OAuth2 password flow).'
                  : 'Create an account. The first account becomes admin.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={authMode === 'login' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('login')}
                >
                  Login
                </Button>
                <Button
                  type="button"
                  variant={authMode === 'register' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('register')}
                >
                  Register
                </Button>
              </div>

              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="jane@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Register'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="shadow-md">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl">Dashboard</CardTitle>
                  <CardDescription>
                    {meQuery.data
                      ? `Signed in as ${meQuery.data.email}`
                      : 'Loading profile...'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {meQuery.data && <Badge variant="secondary">Role: {meQuery.data.role}</Badge>}
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm md:grid-cols-3">
                  <Badge variant="outline">Total tasks: {taskStats.total}</Badge>
                  <Badge variant="outline">Completed: {taskStats.completed}</Badge>
                  <Badge variant="outline">Open: {taskStats.open}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Task</CardTitle>
                <CardDescription>Create a new task for the current user.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreateTask}>
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Title</Label>
                    <Input
                      id="task-title"
                      value={newTitle}
                      onChange={(event) => setNewTitle(event.target.value)}
                      placeholder="Ship assignment"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      value={newDescription}
                      onChange={(event) => setNewDescription(event.target.value)}
                      placeholder="Add details (optional)"
                      rows={4}
                    />
                  </div>

                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>
                      {isAdmin
                        ? 'Admin can view all tasks. Regular users only see their tasks.'
                        : 'You can update or delete your own tasks.'}
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant={showAllTasks ? 'default' : 'outline'}
                      onClick={() => setShowAllTasks((value) => !value)}
                    >
                      {showAllTasks ? 'Showing all tasks' : 'Show all tasks'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isDashboardLoading ? (
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                ) : tasksQuery.isError ? (
                  <p className="text-sm text-destructive">{extractErrorMessage(tasksQuery.error)}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tasksQuery.data ?? []).map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="max-w-lg truncate text-xs text-muted-foreground">
                                {task.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={task.is_completed ? 'default' : 'secondary'}>
                              {task.is_completed ? 'Completed' : 'Open'}
                            </Badge>
                          </TableCell>
                          <TableCell>{task.owner_id}</TableCell>
                          <TableCell>{new Date(task.updated_at).toLocaleString()}</TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(task)}>
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteTaskMutation.mutate(task.id)}
                              disabled={deleteTaskMutation.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>User Management (Admin)</CardTitle>
                  <CardDescription>Promote/demote user roles.</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  ) : usersQuery.isError ? (
                    <p className="text-sm text-destructive">{extractErrorMessage(usersQuery.error)}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(usersQuery.data ?? []).map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.full_name}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    userId: user.id,
                                    role: user.role === 'admin' ? 'user' : 'admin',
                                  })
                                }
                                disabled={updateRoleMutation.isPending}
                              >
                                Make {user.role === 'admin' ? 'User' : 'Admin'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update title, description, and completion status.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-completed"
                type="checkbox"
                checked={editCompleted}
                onChange={(event) => setEditCompleted(event.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="edit-completed">Completed</Label>
            </div>

            <Separator />

            <DialogFooter>
              <Button type="submit" disabled={updateTaskMutation.isPending}>
                {updateTaskMutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default App

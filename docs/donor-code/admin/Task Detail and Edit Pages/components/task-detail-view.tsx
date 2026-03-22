'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Calendar, Users, MessageSquare, Paperclip, Play } from 'lucide-react'
import { mockTask } from '@/lib/mock-data'

interface TaskDetailViewProps {
  task: typeof mockTask
  onEdit: () => void
}

export default function TaskDetailView({ task, onEdit }: TaskDetailViewProps) {
  const progress = Math.min((task.loggedTime / task.estimatedTime) * 100, 100)
  const estHours = Math.floor(task.estimatedTime / 60)
  const estMins = task.estimatedTime % 60
  const loggedHours = Math.floor(task.loggedTime / 60)
  const loggedMins = task.loggedTime % 60

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">

        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {task.id}
          </span>
          <Button onClick={onEdit} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Edit Task
          </Button>
        </div>

        {/* Title Card */}
        <Card className="p-6 mb-4 border-border">
          <h1 className="text-2xl font-bold text-foreground mb-3">{task.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{task.description}</p>
        </Card>

        {/* 4-Column Info Row */}
        <div className="grid grid-cols-12 gap-4 mb-4">

          {/* Phase & Status Card */}
          <Card className="col-span-12 md:col-span-3 p-3.5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Phase & Status
            </h3>
            <div className="mb-3 pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <span className="inline-flex items-center w-full justify-center px-3 py-1.5 bg-amber-500 text-white text-sm font-semibold rounded-lg shadow-sm">
                {task.status}
              </span>
            </div>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Phase</p>
              <span className="inline-flex items-center w-full justify-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                {task.phase}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <span className="inline-flex items-center w-full justify-center px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-100">
                {task.type}
              </span>
            </div>
          </Card>

          {/* Schedule Card */}
          <Card className="col-span-12 md:col-span-3 p-3.5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </h3>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <p className="text-sm font-mono font-medium text-foreground">{task.startDate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due</p>
              <p className="text-sm font-mono font-medium text-foreground">{task.dueDate}</p>
            </div>
          </Card>

          {/* Assignees Card */}
          <Card className="col-span-12 md:col-span-3 p-3.5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Assignees
            </h3>
            <div className="space-y-1.5">
              {task.assignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-2">
                  <div className={`${assignee.color} w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0`}>
                    {assignee.avatar}
                  </div>
                  <span className="text-xs text-foreground">{assignee.name}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Resources Card */}
          <Card className="col-span-12 md:col-span-3 p-3.5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" />
              Resources
            </h3>
            <div className="space-y-1.5">
              {task.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                >
                  <span className="text-xs font-mono text-muted-foreground uppercase">{resource.type}</span>
                  <span className="text-xs text-foreground">{resource.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Time Tracking Card — full width */}
        <Card className="p-5 border-border mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Time Tracking
            </h3>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Play className="w-3 h-3 mr-1" />
              Start Timer
            </Button>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Estimated</p>
              <p className="text-lg font-mono font-semibold text-foreground">{estHours}h {estMins}m</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Logged</p>
              <p className="text-lg font-mono font-semibold text-primary">{loggedHours}h {loggedMins}m</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">Progress ({Math.round(progress)}%)</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-0">
            {task.timeLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-t border-border">
                <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                  {log.avatar}
                </div>
                <span className="text-sm text-foreground flex-1">{log.description}</span>
                <span className="text-xs font-mono text-muted-foreground">{log.date}</span>
                <span className="text-sm font-mono font-medium text-foreground">{log.duration}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Discussion Card — full width */}
        <Card className="p-5 border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Discussion ({task.comments.length})
          </h3>
          <div className="space-y-4">
            {task.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                  {comment.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium shrink-0">
                You
              </div>
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 bg-secondary/50 border-0 rounded-lg px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}

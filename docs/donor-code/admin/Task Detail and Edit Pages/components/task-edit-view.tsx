'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Clock, Calendar, Users, Paperclip } from 'lucide-react'
import { mockTask } from '@/lib/mock-data'

interface TaskEditViewProps {
  task: typeof mockTask
  onSave: (task: typeof mockTask) => void
  onCancel: () => void
}

export default function TaskEditView({ task, onSave, onCancel }: TaskEditViewProps) {
  const [formData, setFormData] = useState(task)

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleTimeChange = (hours: number, minutes: number) => {
    const totalMinutes = hours * 60 + minutes
    setFormData((prev) => ({
      ...prev,
      estimatedTime: totalMinutes,
    }))
  }

  const handleSave = () => {
    onSave(formData)
  }

  const hours = Math.floor(formData.estimatedTime / 60)
  const minutes = formData.estimatedTime % 60

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-mono font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {formData.id}
          </span>
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Title & Description Card */}
        <Card className="p-6 mb-6 border-border">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full p-3 border border-border rounded-lg text-sm resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Classification Card */}
          <Card className="col-span-12 md:col-span-4 p-5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Classification
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phase</label>
                <Input
                  value={formData.phase}
                  onChange={(e) => handleChange('phase', e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Type</label>
                <Input
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <Input
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </Card>

          {/* Schedule Card */}
          <Card className="col-span-6 md:col-span-4 p-5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
          </Card>

          {/* Assignees Card */}
          <Card className="col-span-6 md:col-span-4 p-5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Assignees
            </h3>
            <div className="flex -space-x-2 mb-3">
              {formData.assignees.map((assignee) => (
                <div
                  key={assignee.id}
                  className={`${assignee.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-card cursor-pointer hover:scale-110 transition-transform`}
                  title={assignee.name}
                >
                  {assignee.avatar}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              + Add Assignee
            </Button>
          </Card>

          {/* Time Estimate Card */}
          <Card className="col-span-12 md:col-span-8 p-5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Time Estimate
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={hours}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, minutes)}
                  className="w-16 h-10 text-center font-mono text-lg"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => handleTimeChange(hours, parseInt(e.target.value) || 0)}
                  className="w-16 h-10 text-center font-mono text-lg"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
            
            {/* Time Logs (read-only in edit mode) */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Time Logs (view only)</p>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {formData.timeLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-1 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs">
                      {log.avatar}
                    </span>
                    <span className="flex-1">{log.description}</span>
                    <span className="font-mono text-xs">{log.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Resources Card */}
          <Card className="col-span-12 md:col-span-4 p-5 border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" />
              Resources
            </h3>
            <div className="space-y-2">
              {formData.resources.map((resource) => (
                <label 
                  key={resource.id} 
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                >
                  <input type="checkbox" defaultChecked className="rounded border-border" />
                  <span className="text-xs font-mono text-muted-foreground uppercase">{resource.type}</span>
                  <span className="text-sm text-foreground">{resource.name}</span>
                </label>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs mt-3">
              + Add Resource
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

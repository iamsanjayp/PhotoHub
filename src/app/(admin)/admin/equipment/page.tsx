'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from '@/actions/equipment'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Camera, Search, Plus, Trash2, Edit3, Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminEquipmentPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [type, setType] = useState<'camera' | 'lens' | 'tripod' | 'lighting' | 'drone' | 'other'>('camera')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<'available' | 'assigned' | 'maintenance' | 'retired'>('available')
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')

  // Query equipment
  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-equipment'],
    queryFn: async () => {
      const res = await getEquipment()
      if (res.error) throw new Error(res.error)
      return res.data || []
    },
    refetchOnWindowFocus: false,
  })

  const equipment = result || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await createEquipment(data)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Equipment added successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add equipment')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await updateEquipment(id, data)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Equipment updated successfully')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update equipment')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteEquipment(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-equipment'] })
      toast.success('Equipment deleted')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete equipment')
    }
  })

  const handleOpenAdd = () => {
    resetForm()
    setSelectedItem(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (item: any) => {
    setSelectedItem(item)
    setName(item.name)
    setType(item.type)
    setModel(item.model || '')
    setSerialNumber(item.serial_number)
    setStatus(item.status)
    setCondition(item.condition)
    setNotes(item.notes || '')
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setName('')
    setType('camera')
    setModel('')
    setSerialNumber('')
    setStatus('available')
    setCondition('good')
    setNotes('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !serialNumber) {
      toast.error('Name and Serial Number are required')
      return
    }

    const payload = {
      name,
      type,
      model: model || null,
      serial_number: serialNumber,
      status,
      condition,
      notes: notes || null,
    }

    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) return
    deleteMutation.mutate(id)
  }

  // Filter list
  const filteredEquipment = equipment.filter((eq) => {
    return (
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      (eq.model || '').toLowerCase().includes(search.toLowerCase()) ||
      eq.serial_number.toLowerCase().includes(search.toLowerCase())
    )
  })

  const statusColors = {
    available: 'bg-green-500/10 text-green-500',
    assigned: 'bg-cyan-500/10 text-cyan-400',
    maintenance: 'bg-yellow-500/10 text-yellow-500',
    retired: 'bg-red-500/10 text-red-500',
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Camera className="h-7 w-7 text-cyan-400" />
            Equipment Inventory
          </h1>
          <p className="text-neutral-400 text-sm">
            Manage club cameras, lenses, drones, and tripods. Log conditions and status.
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:opacity-90 font-bold rounded-xl gap-2 shadow-md shadow-cyan-500/10 h-10"
        >
          <Plus className="h-5 w-5" />
          <span>Add Gear</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="flex gap-4 items-center bg-black/20 p-4 border border-white/5 rounded-2xl max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Search name, model, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-white/5 bg-white/[0.02] text-sm text-neutral-200 placeholder-neutral-500 rounded-xl focus-visible:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Grid Table */}
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            Inventory Assets
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Total gear registered: {equipment.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full bg-neutral-900 rounded-lg" />
              ))}
            </div>
          ) : filteredEquipment.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No equipment found in the inventory database.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-white/5">
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider pl-6">Gear Asset</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Type</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Condition</TableHead>
                  <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Serial Number</TableHead>
                  <TableHead className="text-right text-neutral-500 font-bold uppercase text-[10px] tracking-wider pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Item Name/Model */}
                    <TableCell className="pl-6">
                      <div>
                        <span className="text-sm font-bold text-white block leading-none mb-1">
                          {item.name}
                        </span>
                        {item.model && (
                          <span className="text-[10px] text-neutral-500 block">
                            Model: {item.model}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Type badge */}
                    <TableCell className="text-xs text-neutral-300 capitalize">
                      {item.type}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge className={cn(
                        "border-none text-[9px] font-bold px-2 py-0.5 rounded-full capitalize",
                        statusColors[item.status as keyof typeof statusColors] || 'bg-neutral-800 text-neutral-400'
                      )}>
                        {item.status}
                      </Badge>
                    </TableCell>

                    {/* Condition */}
                    <TableCell className="text-xs text-neutral-300 capitalize">
                      {item.condition}
                    </TableCell>

                    {/* Serial Number */}
                    <TableCell className="text-xs font-mono text-neutral-400">
                      {item.serial_number}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6 flex justify-end gap-1.5 pt-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(item)}
                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Gear Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-neutral-950 border-white/5 text-neutral-200 rounded-3xl sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-bold text-white">
                {selectedItem ? 'Edit Gear Details' : 'Add Gear to Inventory'}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Register cameras, lenses, drones, or lightings to the operations inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-neutral-300 font-semibold text-xs">Asset Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sony Alpha A7 IV"
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-neutral-300 font-semibold text-xs">Type</Label>
                  <Select value={type} onValueChange={(val: any) => setType(val)}>
                    <SelectTrigger className="h-9 border-white/5 bg-white/[0.02] text-xs font-semibold rounded-lg text-neutral-300 w-full focus:ring-cyan-500/50 capitalize">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/5 text-neutral-200">
                      {['camera', 'lens', 'tripod', 'lighting', 'drone', 'other'].map((t) => (
                        <SelectItem key={t} value={t} className="focus:bg-white/5 focus:text-white capitalize text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-neutral-300 font-semibold text-xs">Model / Brand</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Sony ILCE-7M4"
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="serial_number" className="text-neutral-300 font-semibold text-xs">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN123456789"
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-neutral-300 font-semibold text-xs">Initial Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger className="h-9 border-white/5 bg-white/[0.02] text-xs font-semibold rounded-lg text-neutral-300 w-full focus:ring-cyan-500/50 capitalize">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/5 text-neutral-200">
                      {['available', 'assigned', 'maintenance', 'retired'].map((s) => (
                        <SelectItem key={s} value={s} className="focus:bg-white/5 focus:text-white capitalize text-xs">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-neutral-300 font-semibold text-xs">Physical Condition</Label>
                  <Input
                    id="condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. good / minor scratches"
                    className="border-white/5 bg-white/[0.02] text-white rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-neutral-300 font-semibold text-xs">Internal Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-white/5 bg-white/[0.02] text-white rounded-xl text-xs placeholder-neutral-700 focus-visible:ring-cyan-500/50"
                  placeholder="Notes on usage history, lens mounts, repairs..."
                />
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 justify-end pt-2 border-t border-white/5">
              <Button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-white/10 hover:bg-white/5 rounded-xl text-xs h-10 px-5 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold rounded-xl text-xs flex items-center gap-1.5 h-10 px-5"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {selectedItem ? 'Update Asset' : 'Add Gear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Permission, Role } from '@prisma/client'
import UserForm from './UserForm'
import UserList from './UserList'
import UserStats from './UserStats'

interface ExtendedUser extends User {
  permissions: Permission[]
  _count: {
    orders: number
    reviews: number
  }
}

interface UserManagerProps {
  users: ExtendedUser[]
  permissions: Permission[]
  stats: any[]
}

export default function UserManager({
  users,
  permissions,
  stats
}: UserManagerProps) {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleUpdateUser = async (data: any) => {
    try {
      const response = await fetch(`/api/admin/users/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Update fehlgeschlagen')

      setIsFormOpen(false)
      setSelectedUser(null)
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleUpdateRole = async (userId: string, role: Role) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const handleUpdatePermissions = async (userId: string, permissions: string[]) => {
    try {
      await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      })
      
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  return (
    <div className="space-y-8">
      <UserStats stats={stats} />
      
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <UserList
            users={users}
            onEdit={setSelectedUser}
            onUpdateRole={handleUpdateRole}
            onUpdatePermissions={handleUpdatePermissions}
          />
          
          {isFormOpen && (
            <UserForm
              user={selectedUser}
              permissions={permissions}
              onSubmit={handleUpdateUser}
              onCancel={() => {
                setIsFormOpen(false)
                setSelectedUser(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
} 
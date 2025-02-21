'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

interface PasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function PasswordForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const { 
    register, 
    handleSubmit, 
    watch,
    reset,
    formState: { errors } 
  } = useForm<PasswordFormData>()

  const newPassword = watch('newPassword')

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true)
    setSuccessMessage('')

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Passwort konnte nicht geändert werden')
      }

      setSuccessMessage('Passwort wurde erfolgreich geändert')
      reset()
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert(error instanceof Error ? error.message : 'Fehler beim Ändern des Passworts')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 sm:p-8">
      <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <label 
            htmlFor="currentPassword" 
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Aktuelles Passwort
          </label>
          <div className="mt-2">
            <input
              type="password"
              {...register('currentPassword', { 
                required: 'Aktuelles Passwort ist erforderlich' 
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
            {errors.currentPassword && (
              <p className="mt-2 text-sm text-red-600">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-4">
          <label 
            htmlFor="newPassword" 
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Neues Passwort
          </label>
          <div className="mt-2">
            <input
              type="password"
              {...register('newPassword', {
                required: 'Neues Passwort ist erforderlich',
                minLength: {
                  value: 8,
                  message: 'Passwort muss mindestens 8 Zeichen lang sein',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: 'Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten',
                },
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
            {errors.newPassword && (
              <p className="mt-2 text-sm text-red-600">
                {errors.newPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="sm:col-span-4">
          <label 
            htmlFor="confirmPassword" 
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Neues Passwort bestätigen
          </label>
          <div className="mt-2">
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Bitte bestätigen Sie das neue Passwort',
                validate: value => 
                  value === newPassword || 'Die Passwörter stimmen nicht überein',
              })}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="mt-6 sm:col-span-6">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {isSubmitting ? 'Wird geändert...' : 'Passwort ändern'}
        </button>
      </div>
    </form>
  )
} 
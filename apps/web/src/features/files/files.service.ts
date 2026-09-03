import { api, apiGetBlob, apiUpload } from '@/lib/api'
import { db } from '@/lib/db/schema'
import type { FileCategory, PatientFile } from './types'

// Recomprime imágenes en el cliente (≤1600px, ~0.8) para pesar poco y entrar en el
// límite de subida. HEIC/HEIF no se pueden dibujar en canvas → se suben tal cual.
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  const max = 1600
  if (width > max || height > max) {
    const scale = max / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.8),
  )
}

export async function uploadPatientFile(
  patientId: string,
  file: File,
  category: FileCategory,
): Promise<PatientFile> {
  let payload: Blob = file
  let fileName = file.name
  const compressible = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp'
  if (compressible) {
    payload = await compressImage(file)
    fileName = fileName.replace(/\.\w+$/, '') + '.jpg'
  }
  const form = new FormData()
  form.append('file', payload, fileName)
  form.append('category', category)
  const row = await apiUpload<PatientFile>(`/patients/${patientId}/files`, form)
  await db.patient_files.put(row)
  return row
}

export async function listPatientFiles(patientId: string): Promise<PatientFile[]> {
  try {
    const { data } = await api.get<{ data: PatientFile[] }>(`/patients/${patientId}/files`)
    // Refresca la caché local para poder listar offline.
    await db.patient_files.where('patientId').equals(patientId).delete()
    if (data.length > 0) await db.patient_files.bulkPut(data)
    return data
  } catch {
    // Sin conexión: listar desde la caché (metadatos; el binario necesita red para verse).
    const cached = await db.patient_files.where('patientId').equals(patientId).toArray()
    return cached.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

/**
 * Descarga el binario privado del archivo y devuelve un objectURL para mostrarlo
 * (miniatura) o abrirlo. Quien llama debe revocar el URL con URL.revokeObjectURL.
 * Requiere red (el binario no está cacheado en Dexie).
 */
export async function fetchPatientFileUrl(patientId: string, fileId: string): Promise<string> {
  const blob = await apiGetBlob(`/patients/${patientId}/files/${fileId}/content`)
  return URL.createObjectURL(blob)
}

export async function deletePatientFile(patientId: string, fileId: string): Promise<void> {
  await api.delete(`/patients/${patientId}/files/${fileId}`)
  await db.patient_files.delete(fileId)
}

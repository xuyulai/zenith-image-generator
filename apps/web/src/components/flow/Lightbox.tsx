import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { blobToDataUrl, blobToObjectUrl, getBlob } from '@/lib/imageBlobStore'
import { useFlowStore } from '@/stores/flowStore'

export function Lightbox() {
  const { t } = useTranslation()
  const lightboxImageId = useFlowStore((s) => s.lightboxImageId)
  const imageNodes = useFlowStore((s) => s.imageNodes)
  const setLightboxImage = useFlowStore((s) => s.setLightboxImage)

  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const currentImage = imageNodes.find((n) => n.id === lightboxImageId)
  const imagesWithUrls = imageNodes.filter((n) => n.data.imageUrl || n.data.imageBlobId)

  // Load blob for display when lightbox opens or image changes
  useEffect(() => {
    if (!currentImage) {
      setDisplayUrl(null)
      return
    }

    // Revoke previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    const { imageBlobId, imageUrl } = currentImage.data

    if (!imageBlobId) {
      setDisplayUrl(imageUrl || null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const blob = await getBlob(imageBlobId)
        if (cancelled) return

        if (blob) {
          const url = blobToObjectUrl(blob)
          objectUrlRef.current = url
          setDisplayUrl(url)
        } else {
          setDisplayUrl(imageUrl || null)
        }
      } catch (e) {
        console.error('Failed to load blob for lightbox:', e)
        setDisplayUrl(imageUrl || null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentImage])

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    setLightboxImage(null)
  }, [setLightboxImage])

  const handlePrev = useCallback(() => {
    if (imagesWithUrls.length <= 1) return
    const currentIdx = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)
    const prevIdx = (currentIdx - 1 + imagesWithUrls.length) % imagesWithUrls.length
    setLightboxImage(imagesWithUrls[prevIdx].id)
  }, [imagesWithUrls, lightboxImageId, setLightboxImage])

  const handleNext = useCallback(() => {
    if (imagesWithUrls.length <= 1) return
    const currentIdx = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)
    const nextIdx = (currentIdx + 1) % imagesWithUrls.length
    setLightboxImage(imagesWithUrls[nextIdx].id)
  }, [imagesWithUrls, lightboxImageId, setLightboxImage])

  const handleDownload = async () => {
    if (!currentImage) return

    const { imageBlobId, imageUrl, seed } = currentImage.data
    const filename = `zenith-${seed}-${Date.now()}.png`

    try {
      // Try to download from blob storage first
      if (imageBlobId) {
        const blob = await getBlob(imageBlobId)
        if (blob) {
          const dataUrl = await blobToDataUrl(blob)
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = filename
          a.click()
          return
        }
      }

      // Fallback to URL download
      if (imageUrl) {
        const { downloadImage } = await import('@/lib/utils')
        await downloadImage(imageUrl, filename)
      }
    } catch (e) {
      console.error('Failed to download image:', e)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxImageId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImageId, handleClose, handlePrev, handleNext])

  if (!currentImage || !displayUrl) return null

  const currentIdxInFiltered = imagesWithUrls.findIndex((n) => n.id === lightboxImageId)

  return (
    <AnimatePresence>
      {lightboxImageId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={handleClose}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          {/* Navigation arrows */}
          {imagesWithUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrev()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Image */}
          <motion.img
            key={lightboxImageId}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={displayUrl}
            alt="Preview"
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Bottom toolbar */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl bg-zinc-900/90 border border-zinc-700"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="toolbar"
          >
            {/* Counter */}
            <span className="text-sm text-zinc-400">
              {currentIdxInFiltered + 1} / {imagesWithUrls.length}
            </span>

            <div className="w-px h-6 bg-zinc-700" />

            {/* Info */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>
                {currentImage.data.width}×{currentImage.data.height}
              </span>
              {currentImage.data.duration && (
                <>
                  <span>•</span>
                  <span>{currentImage.data.duration}</span>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-zinc-700" />

            {/* Download */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm transition-colors"
            >
              <Download size={14} />
              {t('common.download')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Lightbox

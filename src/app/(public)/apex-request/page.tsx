import type { Metadata } from 'next'
import ApexRequestForm from '@/components/apex/apex-request-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Submit APEX Coverage Request | PhotoHub',
  description: 'Request photography or videography coverage for college events from the BIT Photography Club.',
}

export default function ApexRequestPage() {
  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col justify-center py-12 px-4 bg-[#0A0A0A]">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Homepage
        </Link>

        <ApexRequestForm />
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
import { getChallengeById } from '@/actions/challenges'
import { getSubmissions } from '@/actions/submissions'
import SubmissionForm from '@/components/events/submission-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, Clock, Award, Star, Trophy, ShieldAlert, FileText, ExternalLink } from 'lucide-react'
import { notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ challengeId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { challengeId } = await params
  const { data: challenge } = await getChallengeById(challengeId)
  return {
    title: challenge ? `${challenge.title} | PhotoHub` : 'Challenge Details | PhotoHub',
    description: challenge?.description || 'Club photography challenge.',
  }
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { challengeId } = await params
  const result = await getChallengeById(challengeId)

  if (result.error || !result.data) {
    notFound()
  }

  const challenge = result.data
  const isExpired = new Date(challenge.end_date) < new Date()

  // Fetch approved submissions for the gallery
  const subResult = await getSubmissions('challenge', challenge.id)
  const publicSubmissions = (subResult.data || []).filter(
    (s: any) => ['approved', 'winner'].includes(s.status)
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      <Link
        href="/challenges"
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Challenges
      </Link>

      {/* Title & Theme Info Header (No Banner!) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {challenge.theme && (
            <Badge className="border-none bg-cyan-500/10 text-cyan-400 font-bold text-[10px] px-2.5 py-0.5">
              Theme: {challenge.theme}
            </Badge>
          )}
          <Badge className={cn(
            "border-none font-bold text-[10px] px-2.5 py-0.5 capitalize",
            isExpired ? 'bg-neutral-800 text-neutral-400' : 'bg-cyan-500 text-black'
          )}>
            {isExpired ? 'Completed' : 'Active'}
          </Badge>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {challenge.title}
        </h1>
        <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-450 dark:text-neutral-400">
          <Clock className="h-4 w-4 text-cyan-400" />
          <span>Ends: {format(new Date(challenge.end_date), 'dd MMMM yyyy')}</span>
        </div>
      </div>

      {/* Shell Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Poster & Content */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Challenge Poster (4:5 Aspect Ratio) */}
            {challenge.banner_url && (
              <div className="md:col-span-2">
                <Card className="border-neutral-200 dark:border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl h-fit">
                  <div className="relative aspect-[4/5] w-full bg-neutral-950 flex items-center justify-center">
                    <img src={challenge.banner_url} alt={challenge.title} className="h-full w-full object-contain" />
                  </div>
                </Card>
              </div>
            )}
            
            {/* Overview & Guidelines details */}
            <div className={cn("space-y-6", challenge.banner_url ? "md:col-span-3" : "md:col-span-5")}>
              <Card className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white">Theme Details & Brief</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line">
                  {challenge.description || 'No detailed instructions provided.'}
                </CardContent>
              </Card>

              {challenge.external_link && (
                <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-4 text-sm text-cyan-400/80">
                  <ExternalLink className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Attachment / External Link</span>
                    Access challenge attachments, guidelines, or external portals:{" "}
                    <a href={challenge.external_link} target={challenge.external_link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-semibold text-cyan-400 hover:underline break-all">
                      {challenge.external_link}
                    </a>
                  </div>
                </div>
              )}

              {/* Submission Guidelines info card */}
              <Card className="border-white/5 bg-black/20 rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Evaluation Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-neutral-500 space-y-2 leading-relaxed">
                  <p>• Only original work captured by the member is permitted. Plagiarism leads to disqualification.</p>
                  <p>• Make sure to submit before the deadline. Late entries are not accepted by the engine.</p>
                  <p>• Evaluation is performed by club administrators. Scores (out of 100) and winners are announced on the club feed.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Side: Submission Widget */}
        <div className="space-y-6">
          {isExpired ? (
            <Card className="border-red-500/10 bg-red-500/5 rounded-2xl p-6 text-center text-red-500">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-bold">Challenge Completed</p>
              <p className="text-xs text-neutral-500 mt-1">
                Submissions are locked as this contest has concluded.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Submission Form */}
              <SubmissionForm
                submittableType="challenge"
                submittableId={challenge.id}
                submissionMode={challenge.submission_mode}
                existingSubmission={challenge.user_submission}
              />

              {/* Award Points card */}
              <Card className="border-white/5 bg-black/40 rounded-2xl p-4 flex justify-between items-center">
                <span className="text-xs text-neutral-400 font-semibold">Award Reward</span>
                <span className="text-cyan-400 font-black text-base flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  +{challenge.points} PTS
                </span>
              </Card>
            </div>
          )}
        </div>

      </div>

      {/* Submissions Gallery Section */}
      {publicSubmissions.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-cyan-400" />
            Submissions Gallery
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {publicSubmissions.map((sub: any) => (
              <Card key={sub.id} className="border-white/5 bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden group">
                <div className="relative aspect-square w-full bg-neutral-900 border-b border-white/5 overflow-hidden">
                  {sub.content_type === 'image' && sub.content_url ? (
                    <img
                      src={sub.content_url}
                      alt="Submission"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center gap-2">
                      <FileText className="h-8 w-8 text-neutral-600" />
                      {sub.external_link ? (
                        <a
                          href={sub.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:underline font-semibold break-all"
                        >
                          View Link
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-500">Text Submission</span>
                      )}
                    </div>
                  )}
                  {sub.status === 'winner' && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-cyan-500 text-black border-none text-[9px] font-bold px-2 py-0.5 shadow-md flex items-center gap-1">
                        <Star className="h-3 w-3 fill-black" />
                        Winner
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border border-white/10 shrink-0">
                      <AvatarImage src={sub.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                        {sub.profiles?.full_name?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-white truncate">
                      {sub.profiles?.full_name || 'Member'}
                    </span>
                  </div>
                  {sub.caption && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {sub.caption}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

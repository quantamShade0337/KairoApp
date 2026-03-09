export interface TrustFactors {
  githubConnected: boolean
  githubRepos: number
  githubFollowers: number
  productCount: number
  totalSales: number
  hasStripeLink: boolean
  hasBio: boolean
  hasAvatar: boolean
}

export function calcTrustScore(f: TrustFactors): number {
  let score = 0

  // GitHub presence (40 pts)
  if (f.githubConnected) {
    score += 25
    score += Math.min(f.githubRepos * 0.3, 8)  // up to 8 for repos
    score += Math.min(f.githubFollowers * 0.1, 7) // up to 7 for followers
  }

  // Products (20 pts)
  score += Math.min(f.productCount * 4, 20)

  // Sales (20 pts)
  score += Math.min(f.totalSales * 0.05, 20)

  // Profile completeness (20 pts)
  if (f.hasStripeLink) score += 8
  if (f.hasBio) score += 7
  if (f.hasAvatar) score += 5

  return Math.min(Math.round(score), 100)
}

export function trustLabel(score: number): string {
  if (score >= 80) return 'Verified'
  if (score >= 50) return 'Trusted'
  return 'New'
}

export function trustColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 50) return '#eab308'
  return '#555'
}

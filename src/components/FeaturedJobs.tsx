import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { JobCard } from './JobCard';
import { Button } from '@/components/ui/button';
import { useJobAccounts } from '@/hooks/useJobs';
import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedJobs() {
  const { data: jobs, isLoading } = useJobAccounts();

  const featuredJobs = jobs?.slice(0, 6) || [];

  return (
    <section className="py-16">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Featured Job Accounts</h2>
            <p className="text-muted-foreground">
              Top-selling remote work opportunities with proven earnings
            </p>
          </div>
          <Link to="/jobs">
            <Button variant="outline" className="group">
              View All Jobs
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card overflow-hidden">
                <Skeleton className="h-32" />
                <div className="p-5">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

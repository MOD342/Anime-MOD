import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ScraperService } from './scraperService';

// Initialize the single shared scraper service instance
const scraper = new ScraperService();

// Define interface for our internal unified Queue Job
export interface ScraperJob {
  id: string;
  name: string;
  data: any;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  result: any;
  error: string | null;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retries: number;
  maxRetries: number;
  logs: string[];
}

export interface QueueSystemStatus {
  isUsingBullMQ: boolean;
  redisConnected: boolean;
  concurrency: number;
  jobs: ScraperJob[];
  stats: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
}

class QueueManager {
  private isUsingBullMQ: boolean = false;
  private redisConnected: boolean = false;
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;
  private redisClient: IORedis | null = null;

  // In-process fallback queue storage to ensure zero downtime
  private localJobs: Map<string, ScraperJob> = new Map();
  private processing: boolean = false;
  private activeJobsCount: number = 0;
  private maxConcurrency: number = 2; // Keep at 2 to avoid overwhelming target sites/IP rates

  constructor() {
    this.initQueueSystem();
  }

  private async initQueueSystem() {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');

    // Attempt to probe Redis with a very fast timeout to fail-safe smoothly
    try {
      console.log(`[Queue System] Probing Redis at redis://${redisHost}:${redisPort}...`);
      const probeClient = new IORedis({
        host: redisHost,
        port: redisPort,
        connectTimeout: 1500,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // Do not retry on probe failure
      });

      probeClient.on('error', (err) => {
        // Suppress print to avoid log noise, fail probe gracefully
      });

      await new Promise<void>((resolve, reject) => {
        probeClient.ping((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // If ping succeeds, standard Redis server is present! We can establish full BullMQ integration.
      probeClient.disconnect();
      this.redisConnected = true;
      this.isUsingBullMQ = true;

      const connectionOpts = {
        host: redisHost,
        port: redisPort
      };

      this.bullQueue = new Queue('scraper-queue', { connection: connectionOpts });
      
      this.bullWorker = new Worker('scraper-queue', async (job) => {
        console.log(`[BullMQ Worker] Processing Job ${job.id} - ${job.name}`);
        job.updateProgress(5);
        const result = await this.executeScrapingTask(job.name, job.data, (progress, logDetail) => {
          job.updateProgress(progress);
          job.log(logDetail);
        });
        job.updateProgress(100);
        return result;
      }, { 
        connection: connectionOpts,
        concurrency: this.maxConcurrency
      });

      console.log('--- [Queue System Setup] SUCCESS: Loaded live BullMQ engine backed by Redis! ✔ ---');
    } catch (e: any) {
      this.isUsingBullMQ = false;
      this.redisConnected = false;
      console.log('--- [Queue System Setup] INFO: Redis connection bypassed. Activating In-Process High-Resiliency Queue Worker! ✔ ---');
      this.startLocalWorkerLoop();
    }

    // Register a periodic scheduler loop for scheduled background scraping (asynchronous queue scheduling)
    this.startSchedulerLoop();
  }

  // Add scrubbing task to queue
  public async addJob(name: string, data: any, maxRetries = 2): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Register the job representation in our local stats database so the UI can view both environments
    const localJobRecord: ScraperJob = {
      id: jobId,
      name,
      data,
      status: 'pending',
      progress: 0,
      result: null,
      error: null,
      createdAt: Date.now(),
      retries: 0,
      maxRetries,
      logs: [`[Queue Event] Job scheduled for execution.`]
    };
    
    this.localJobs.set(jobId, localJobRecord);

    if (this.isUsingBullMQ && this.bullQueue) {
      try {
        await this.bullQueue.add(name, data, { 
          jobId,
          attempts: maxRetries + 1,
          backoff: 5000 
        });
        this.logToJob(jobId, `[BullMQ Admin] Successfully registered to BullMQ cluster.`);
      } catch (err: any) {
        this.logToJob(jobId, `[BullMQ Warning] Registration error: ${err.message}. Defaulting to in-process execution.`);
      }
    }

    // Trigger local loop check asynchronously
    this.triggerLocalWorker();

    return jobId;
  }

  // Trigger internal in-process worker loop to process jobs in parallel with strict concurrency limits
  private triggerLocalWorker() {
    if (this.isUsingBullMQ) return; // Managed by BullMQ natively
    if (this.processing) return;

    this.startLocalWorkerLoop();
  }

  private async startLocalWorkerLoop() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        // Find all jobs that are pending
        const pendingJobs = Array.from(this.localJobs.values())
          .filter(j => j.status === 'pending')
          .sort((a, b) => a.createdAt - b.createdAt);

        if (pendingJobs.length === 0 || this.activeJobsCount >= this.maxConcurrency) {
          break;
        }

        // Get the next job to run
        const job = pendingJobs[0];
        this.processLocalJobAsync(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processLocalJobAsync(job: ScraperJob) {
    this.activeJobsCount++;
    job.status = 'active';
    job.startedAt = Date.now();
    this.logToJob(job.id, `[Worker Event] Thread spawned. Initiating task execution...`);

    try {
      job.progress = 5;
      const result = await this.executeScrapingTask(job.name, job.data, (progress, logDetail) => {
        job.progress = progress;
        this.logToJob(job.id, logDetail);
      });

      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completedAt = Date.now();
      this.logToJob(job.id, `[Success] Task completed successfully in ${((Date.now() - (job.startedAt || 0)) / 1000).toFixed(2)} seconds.`);
    } catch (err: any) {
      job.retries++;
      const errMsg = err.message || err;
      this.logToJob(job.id, `[Error] Attempt ${job.retries} failed: ${errMsg}`);

      if (job.retries <= job.maxRetries) {
        job.status = 'pending';
        this.logToJob(job.id, `[Retry Handler] Rescheduling task for retrial in 3 seconds.`);
        setTimeout(() => {
          this.triggerLocalWorker();
        }, 3000);
      } else {
        job.status = 'failed';
        job.error = errMsg;
        job.completedAt = Date.now();
        this.logToJob(job.id, `[Pipeline Failure] Task failed all retry attempts.`);
      }
    } finally {
      this.activeJobsCount--;
      this.triggerLocalWorker(); // check for next jobs
    }
  }

  private logToJob(jobId: string, logMessage: string) {
    const job = this.localJobs.get(jobId);
    if (job) {
      const timestamp = new Date().toLocaleTimeString();
      job.logs.push(`[${timestamp}] ${logMessage}`);
    }
  }

  // core scraper router executor
  private async executeScrapingTask(name: string, data: any, updateProgress: (perc: number, log: string) => void): Promise<any> {
    updateProgress(10, `Starting work on task type: "${name}".`);
    
    switch (name) {
      case 'preWarmDashboard': {
        updateProgress(20, `Fetching and formatting schedule lists...`);
        const schedule = await scraper.getSchedule();
        updateProgress(50, `Successfully scraped indices for ${schedule.length} scheduled shows.`);

        updateProgress(60, `Scraping popular content feeds from main portal...`);
        const recentEpisodes = await scraper.getRecentEpisodes();
        updateProgress(90, `Successfully pre-cached ${recentEpisodes.length} recent stream releases.`);

        return {
          preWarmedCount: schedule.length + recentEpisodes.length,
          timestamp: Date.now()
        };
      }

      case 'fetchAnimeDetails': {
        const { animeId } = data;
        if (!animeId) throw new Error('أمير الأنمي ID مفقود.');
        updateProgress(30, `Dispatching details scraper for: "${animeId}"`);
        const details = await scraper.getAnimeDetails(animeId);
        updateProgress(85, `Retrieved details: ${details.title || animeId}. Packing payload...`);
        return details;
      }

      case 'fetchEpisodeServers': {
        const { episodeId } = data;
        if (!episodeId) throw new Error('مفتاح الحلقة ID مفقود.');
        updateProgress(40, `Resolving safe media streams for episode: "${episodeId}"`);
        const servers = await scraper.getEpisodeServers(episodeId);
        updateProgress(90, `Found ${servers.length} premium stream mirrors.`);
        return servers;
      }

      default:
        throw new Error(`Task type "${name}" represents an unsupported execution operation.`);
    }
  }

  // Periodic Scheduler Loop (Schedules warmup jobs in background)
  private startSchedulerLoop() {
    // Run pre-warmups immediately 5 seconds after server startup
    setTimeout(() => {
      this.addJob('preWarmDashboard', {}, 1)
        .then(id => console.log(`[Queue Scheduler] Automatically scheduled Dashboard pre-warmup. Job ID: ${id}`))
        .catch(e => console.error(`[Queue Scheduler] Dynamic pre-warmup injection failed:`, e));
    }, 5000);

    // Schedule Dashboard warmups every 15 minutes to keep caches continuously updated
    setInterval(() => {
      console.log(`[Queue Scheduler] Dispatching background periodic dashboard check...`);
      this.addJob('preWarmDashboard', {}, 1)
        .catch(e => console.error(`[Queue Scheduler] Error:`, e));
    }, 15 * 60 * 1000);
  }

  // Request logs and stats for dashboard
  public getStatus(): QueueSystemStatus {
    const list = Array.from(this.localJobs.values())
      .sort((a, b) => b.createdAt - a.createdAt); // Order newest first

    const stats = {
      pending: list.filter(j => j.status === 'pending').length,
      active: list.filter(j => j.status === 'active').length,
      completed: list.filter(j => j.status === 'completed').length,
      failed: list.filter(j => j.status === 'failed').length,
      total: list.length
    };

    return {
      isUsingBullMQ: this.isUsingBullMQ,
      redisConnected: this.redisConnected,
      concurrency: this.maxConcurrency,
      jobs: list.slice(0, 50), // Send only the last 50 jobs to keep the response slim
      stats
    };
  }

  // Manual trigger for cleaning complete/failed jobs
  public clearJobs() {
    this.localJobs.clear();
    return true;
  }
}

export const ScraperQueue = new QueueManager();

import AppError from "./AppError.js";
import AppLogger from "./AppLogger.js";

type QueuedFunction = (...arg0: any[]) => Promise<any>;
interface ListNodeOpts {
  func: QueuedFunction;
  args?: any[];
  next?: ListNode | null;
  catch?: (Err: any) => any;
}

/**
 * Represents a node in the function queue.
 */
class ListNode {
  public func: QueuedFunction;
  public args: any[] = [];
  public next: ListNode | null;
  public catch?: (Err: any) => any;

  /**
   * Creates a new ListNode.
   * @param func - The function to add to the queue.
   * @param next - The next ListNode in the queue.
   */
  constructor(Opts: ListNodeOpts) {
    this.func = Opts.func;
    this.args = Opts.args ?? [];
    this.next = Opts.next ?? null;
    this.catch = Opts.catch;
  }
}

/**
 * Represents a queue of functions.
 */
export default class FunctionQueue {
  /** A map of unique ids to function queues. */
  private static readonly instances: Map<string, FunctionQueue> = new Map();
  public readonly id: string;

  private emptyTimeout: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private head: ListNode | null = null;
  private tail: ListNode | null = null;

  /**
   * Create a new FunctionQueue.
   * @param UniqueId - The unique id of the queue to be used.
   * @throws {AppError} If a queue already exists with the specified unique id.
   */
  constructor(UniqueId: string) {
    if (FunctionQueue.instances.has(UniqueId)) {
      throw new AppError({
        message: "Attempt creation of multiple FunctionQueue instances with the same id.",
        code: 1,
      });
    }

    this.id = UniqueId;
    FunctionQueue.instances.set(UniqueId, this);
    this.StartEmptyQueueCheck();
  }

  private StartEmptyQueueCheck() {
    // Check every 5 minutes
    this.emptyTimeout = setInterval(
      () => {
        if (this.QueueLength === 0) {
          clearInterval(this.emptyTimeout!);
          FunctionQueue.instances.delete(this.id);
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * Checks if the queue is currently running.
   * @returns True if the queue is running, false otherwise.
   */
  public get IsRunning(): boolean {
    return this.running;
  }

  /**
   * Gets the length of the current queue.
   * @returns The length of the queue.
   */
  public get QueueLength(): number {
    let Length = 0;
    let Current = this.head;

    while (Current !== null) {
      Length++;
      Current = Current.next;
    }

    return Length;
  }

  /**
   * Enqueues a function in the queue.
   * @param Func - The function to enqueue.
   * @param [Args] - The arguments to be passed to the enqueued function on execution.
   * @param [ErrHandler] - A callback which can be specified to handle any error occurs while executing the function.
   * @returns {void}
   */
  public Enqueue<QFunc extends QueuedFunction>(
    Func: QFunc,
    ErrHandler?: (Err: any) => any,
    ...Args: Parameters<QFunc>
  ): void {
    const NewNode = new ListNode({
      func: Func,
      args: Args,
      catch: ErrHandler,
    });

    if (this.head) {
      this.tail!.next = NewNode;
    } else {
      this.head = NewNode;
    }

    this.tail = NewNode;
    this.ProcessQueue();
  }

  /**
   * Processes the queue by executing the enqueued functions in order.
   */
  private async ProcessQueue() {
    if (this.running || this.head === null) return;
    else this.running = true;

    while (this.head !== null) {
      const QueuedFunc = this.head.func;
      const ErrHandler = this.head.catch;

      try {
        await QueuedFunc(...this.head.args);
      } catch (Err: any) {
        if (ErrHandler) {
          ErrHandler(Err);
        } else {
          AppLogger.error({
            label: "Utilities:Classes:FunctionQueue",
            message: "An error occurred while processing the function queue.",
            stack: Err.stack,
            details: {
              ...Err,
            },
          });
        }
      } finally {
        this.head = this.head.next;
      }
    }

    this.running = false;
  }

  /**
   * Gets a created/constructed instance which has the given id.
   * If the instance does not exist, it will create a new one.
   * @param UniqueId - The unique id of the queue.
   * @returns
   */
  public static GetInstance(UniqueId: string): FunctionQueue {
    if (!FunctionQueue.instances.has(UniqueId)) {
      FunctionQueue.instances.set(UniqueId, new FunctionQueue(UniqueId));
    }

    return FunctionQueue.instances.get(UniqueId) as FunctionQueue;
  }
}

// A subscriber in the form of a callback
export type Subscriber<T> = (newValue: T, oldValue: T) => void;
type Cloneable<T> = (value: T) => T;

export const enum SubscriberType {
    PRE_UPDATE,
    POST_UPDATE,
}

/**
 * An observable object with the ability of subscription
 */
export interface Observable<T> {
    /**
     * Retrieves the update-to-date value of the observable
     */
    value(): T;

    /**
     * Appends a callback that is evoked when the value updates, returns an id
     * @param callback
     * @param type
     */
    subscribe(callback: Subscriber<T>, type?: SubscriberType): number;

    /**
     * Unsubscribes a subscription based on its id
     * @param id
     */
    unsubscribe(id: number): void;

    /**
     * Updates the value of the observable
     * @param newValue
     */
    update(newValue: T): void;
}

export type GetObservable<T extends Observable<any>> = ReturnType<T['value']>;


/**
 * Implementation of the Observable interface
 */
export class TDObservable<T> implements Observable<T> {
    private internal: T;
    private subscribers: Record<
        number,
        {
            subscription: Subscriber<T>,
            type: SubscriberType
        }
    >;

    private readonly clone: Cloneable<T>;

    constructor(
        initialValue: T,
        clone: Cloneable<T> = (x => x)
    ) {
        this.internal = initialValue;
        this.clone = clone;
        this.subscribers = {};
    }


    value(): T {
        return this.internal;
    }

    update(newValue: T): void {
        // fire all the subscribers
        for (const subscriber of Object.values(this.subscribers)) {
            if (subscriber.type === SubscriberType.PRE_UPDATE) {
                subscriber.subscription(newValue, this.internal);
            }
        }

        const oldValue = this.clone(this.internal);
        this.internal = newValue;

        // fire the post-update subscriptions
        for (const subscriber of Object.values(this.subscribers)) {
            if (subscriber.type === SubscriberType.POST_UPDATE) {
                subscriber.subscription(newValue, oldValue);
            }
        }
    }

    subscribe(
        callback: Subscriber<T>,
        type: SubscriberType = SubscriberType.POST_UPDATE
    ): number {
        const entry = {
            type,
            subscription: callback
        };

        const newId = this.findId();
        this.subscribers[newId] = entry

        return newId;
    }

    unsubscribe(id: number): void {
        const ids = Object.keys(this.subscribers);
        if (!ids.includes(id.toString())) {
            console.error("cannot find subscription key to delete", id);
            return;
        }

        delete this.subscribers[id];
    }


    private findId(): number {
        const ids = Object.keys(this.subscribers);

        let id = 0;
        while (ids.includes(id.toString())) {
            id++;
        }

        return id;
    }
}


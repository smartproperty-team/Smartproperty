// Push Notification Service
// Handles browser notifications and push subscriptions

import api from './api';

class PushNotificationService {
  private vapidPublicKey: string | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize push notifications
   * - Register service worker
   * - Request notification permissions
   * - Subscribe to push notifications
   */
  async initialize(): Promise<void> {
    try {
      console.log('📱 Push Notification: Initializing...');

      // Check browser support
      if (!('serviceWorker' in navigator)) {
        console.warn('📱 Push Notification: Service Worker not supported');
        return;
      }

      if (!('Notification' in window)) {
        console.warn('📱 Push Notification: Notifications API not supported');
        return;
      }

      // Register service worker
      await this.registerServiceWorker();

      // Request notification permission
      await this.requestNotificationPermission();

      // Subscribe to push
      await this.subscribeToPush();

      console.log('✅ Push Notification: Initialized successfully');
    } catch (error) {
      console.error('❌ Push Notification: Initialization failed', error);
    }
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('✅ Push Notification: Service Worker registered');
      }
    } catch (error) {
      console.error(
        '❌ Push Notification: Service Worker registration failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Request user permission for notifications
   */
  private async requestNotificationPermission(): Promise<void> {
    try {
      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        console.log('✅ Push Notification: Permission already granted');
        return;
      }

      // Skip if user denied previously
      if (Notification.permission === 'denied') {
        console.warn('⚠️  Push Notification: Permission denied by user');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Push Notification: Permission granted by user');
      } else {
        console.warn('⚠️  Push Notification: Permission denied by user');
      }
    } catch (error) {
      console.error('❌ Push Notification: Permission request failed', error);
    }
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<void> {
    try {
      // Must have permission first
      if (Notification.permission !== 'granted') {
        console.warn('⚠️  Push Notification: No permission to subscribe');
        return;
      }

      // Must have service worker
      if (!this.registration) {
        await this.registerServiceWorker();
      }

      // Get VAPID public key from backend
      const keyResponse = await api.get('/notifications/push/public-key');
      this.vapidPublicKey = keyResponse.data?.publicKey || keyResponse.data;

      if (!this.vapidPublicKey) {
        console.error('❌ Push Notification: No VAPID public key from server');
        return;
      }

      console.log('✅ Push Notification: Got VAPID public key');

      // Subscribe to push
      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          this.vapidPublicKey,
        ) as BufferSource,
      });

      console.log('✅ Push Notification: Subscribed to push');

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
    } catch (error) {
      console.error('❌ Push Notification: Push subscription failed', error);
    }
  }

  /**
   * Send subscription to backend
   */
  private async sendSubscriptionToBackend(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      // Convert subscription to plain JSON object to ensure all properties are included
      const subscriptionJson = subscription.toJSON();

      console.log(
        '📤 Push Notification: Sending subscription:',
        JSON.stringify(subscriptionJson),
      );

      const response = await api.post(
        '/notifications/push/subscribe',
        subscriptionJson,
      );

      console.log(
        '✅ Push Notification: Subscription sent to backend',
        response.data,
      );
    } catch (error) {
      console.error('❌ Push Notification: Failed to send subscription', error);
      if ((error as any)?.response?.data) {
        console.error('Backend error details:', (error as any).response.data);
      }
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      'serviceWorker' in navigator
    );
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const pushNotificationService = new PushNotificationService();

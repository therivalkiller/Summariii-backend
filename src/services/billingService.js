import stripe, { stripeConfig } from "../config/stripe.js";
import { models } from "../db/client.js";
import config from "../config/env.js";

/**
 * Billing Service
 * Handles Stripe payments and feature unlocking
 */
class BillingService {
  /**
   * Create checkout session for payment
   * @param {Object} params - Checkout parameters
   * @param {string} params.userId - User ID
   * @param {string} params.clerkUserId - Clerk user ID
   * @param {string} params.email - User email
   * @returns {Promise<Object>} - Checkout session
   */
  async createCheckoutSession({ userId, clerkUserId, email }) {
    try {
      // Get or create Stripe customer
      let user = await models.User.findOne({ where: { clerkUserId } });

      if (!user) {
        // Create user record if doesn't exist
        user = await models.User.create({
          clerkUserId,
          email,
        });
      }

      let stripeCustomerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email,
          metadata: {
            clerkUserId,
            userId: user.id,
          },
        });

        stripeCustomerId = customer.id;

        // Update user with Stripe customer ID
        await user.update({ stripeCustomerId });
      }

      // Create checkout session - email only, no payment method
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [
          {
            price: stripeConfig.priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        payment_method_collection: "if_required",
        success_url: `${config.apiBaseUrl}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.apiBaseUrl}/api/billing/cancel`,
        metadata: {
          userId: user.id,
          clerkUserId,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error("Checkout session error:", error.message);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Handle successful payment
   * @param {string} sessionId - Stripe session ID
   * @returns {Promise<Object>} - Payment result
   */
  async handleSuccessfulPayment(sessionId) {
    try {
      // Retrieve session
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      const userId = session.metadata.userId;

      // Get user
      const user = await models.User.findByPk(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Create payment record
      await models.Payment.create({
        userId,
        stripePaymentId: session.subscription || session.id,
        stripeSessionId: sessionId,
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        status: "succeeded",
      });

      // Update user to paid status
      await user.update({ isPaidUser: true });

      // Unlock features
      const features = await models.FeatureUnlock.findOne({
        where: { userId },
      });

      if (features) {
        await features.update({ customAIProvider: true });
      } else {
        await models.FeatureUnlock.create({
          userId,
          customAIProvider: true,
        });
      }

      console.log(
        `✅ Payment successful for user ${userId}, features unlocked`,
      );

      return {
        success: true,
        userId,
        featuresUnlocked: ["customAIProvider"],
      };
    } catch (error) {
      console.error("Payment handling error:", error.message);
      throw new Error(`Failed to handle payment: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<void>}
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          await this.handleSuccessfulPayment(session.id);
          break;
        }

        case "customer.subscription.created": {
          console.log("✅ Subscription created:", event.data.object.id);
          break;
        }

        case "customer.subscription.deleted": {
          console.log("❌ Subscription cancelled:", event.data.object.id);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error("Webhook handling error:", error.message);
      throw error;
    }
  }

  /**
   * Check if user has paid
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - True if paid
   */
  async checkPaidStatus(userId) {
    try {
      const user = await models.User.findByPk(userId);
      return user?.isPaidUser || false;
    } catch (error) {
      console.error("Paid status check error:", error.message);
      return false;
    }
  }

  /**
   * Check if user has specific feature unlocked
   * @param {string} userId - User ID
   * @param {string} feature - Feature name
   * @returns {Promise<boolean>} - True if unlocked
   */
  async checkFeatureUnlock(userId, feature) {
    try {
      const features = await models.FeatureUnlock.findOne({
        where: { userId },
      });

      if (!features) {
        return false;
      }

      return features[feature] || false;
    } catch (error) {
      console.error("Feature check error:", error.message);
      return false;
    }
  }

  /**
   * Get user's payment history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Payment history
   */
  async getPaymentHistory(userId) {
    try {
      const payments = await models.Payment.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });

      return payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      }));
    } catch (error) {
      console.error("Payment history error:", error.message);
      return [];
    }
  }
}

// Export singleton instance
const billingService = new BillingService();
export default billingService;

import { Router } from 'express'
import { requireAdmin } from './shared'
import { publicRouter as authPublicRouter, protectedRouter as authProtectedRouter } from './auth'
import bookingsRouter from './bookings'
import fleetRouter from './fleet'
import customersRouter from './customers'
import financeRouter from './finance'
import configRouter from './config'
import payrollRouter from './payroll'

const router = Router()

// Public routes (no auth): admin OTP login + Razorpay webhook
router.use(authPublicRouter)

// Everything below requires admin auth
router.use(requireAdmin)

router.use(authProtectedRouter)
router.use(bookingsRouter)
router.use(fleetRouter)
router.use(customersRouter)
router.use(financeRouter)
router.use(configRouter)
router.use(payrollRouter)

export default router

import { emailTemplates, sendEmail } from "@/lib/email";
import dbConnect from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { NextRequest, NextResponse } from "next/server";

// For security, you should set a secret token in your environment
const CRON_SECRET = process.env.CRON_SECRET || "default-secret-change-me";

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const today = new Date();
    const weekFromToday = new Date();
    weekFromToday.setDate(today.getDate() + 7);

    // Normalize dates to compare only date parts (ignore time)
    const todayStr = today.toISOString().split("T")[0];
    const weekFromTodayStr = weekFromToday.toISOString().split("T")[0];

    console.log(`Running cicilan reminder cron job at ${today.toISOString()}`);
    console.log(
      `Looking for due dates: ${todayStr} (today) and ${weekFromTodayStr} (7 days from now)`
    );

    // Find installments due today and in 7 days
    const installmentsDueToday = await Payment.find({
      paymentType: "cicilan-installment",
      status: { $nin: ["approved", "completed"] }, // Not already paid
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
          todayStr,
        ],
      },
    }).populate("userId", "fullName email");

    const installmentsDueInWeek = await Payment.find({
      paymentType: "cicilan-installment",
      status: { $nin: ["approved", "completed"] }, // Not already paid
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
          weekFromTodayStr,
        ],
      },
    }).populate("userId", "fullName email");

    console.log(`Found ${installmentsDueToday.length} installments due today`);
    console.log(
      `Found ${installmentsDueInWeek.length} installments due in 7 days`
    );

    const results = {
      dueTodayEmails: 0,
      dueInWeekEmails: 0,
      errors: [] as any[],
    };

    // Send due date reminders (urgent)
    for (const installment of installmentsDueToday) {
      try {
        if (!installment.userId?.email) {
          console.warn(
            `No email for user ${installment.userId?._id} for installment ${installment._id}`
          );
          continue;
        }

        const template = emailTemplates.dueDateReminder(
          installment.userId.fullName || "Investor",
          installment.productName || "Investasi Hijau",
          installment.dueDate.toLocaleDateString("id-ID"),
          installment.installmentAmount || installment.amount
        );

        const emailResult = await sendEmail(
          installment.userId.email,
          template.subject,
          template.html
        );

        if (emailResult.success) {
          results.dueTodayEmails++;
          console.log(`Sent due date reminder to ${installment.userId.email}`);
        } else {
          results.errors.push(
            `Failed to send due date email to ${installment.userId.email}: ${emailResult.error}`
          );
        }
      } catch (error) {
        results.errors.push(
          `Error processing due today installment ${installment._id}: ${
            (error as any).message
          }`
        );
      }
    }

    // Send weekly reminders
    for (const installment of installmentsDueInWeek) {
      try {
        if (!installment.userId?.email) {
          console.warn(
            `No email for user ${installment.userId?._id} for installment ${installment._id}`
          );
          continue;
        }

        const template = emailTemplates.weeklyReminder(
          installment.userId.fullName || "Investor",
          installment.productName || "Investasi Hijau",
          installment.dueDate.toLocaleDateString("id-ID"),
          installment.installmentAmount || installment.amount
        );

        const emailResult = await sendEmail(
          installment.userId.email,
          template.subject,
          template.html
        );

        if (emailResult.success) {
          results.dueInWeekEmails++;
          console.log(`Sent weekly reminder to ${installment.userId.email}`);
        } else {
          results.errors.push(
            `Failed to send weekly email to ${installment.userId.email}: ${emailResult.error}`
          );
        }
      } catch (error) {
        results.errors.push(
          `Error processing weekly installment ${installment._id}: ${
            (error as any).message
          }`
        );
      }
    }

    console.log("Cicilan reminder cron job completed:", results);

    return NextResponse.json({
      success: true,
      message: "Cicilan reminders processed",
      results: {
        dueTodayCount: installmentsDueToday.length,
        dueInWeekCount: installmentsDueInWeek.length,
        dueTodayEmailsSent: results.dueTodayEmails,
        dueInWeekEmailsSent: results.dueInWeekEmails,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error("Cicilan reminder cron job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process cicilan reminders",
        details: (error as any).message,
      },
      { status: 500 }
    );
  }
}

// For manual testing/debugging
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const today = new Date();
    const weekFromToday = new Date();
    weekFromToday.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const weekFromTodayStr = weekFromToday.toISOString().split("T")[0];

    const installmentsDueToday = await Payment.countDocuments({
      paymentType: "cicilan-installment",
      status: { $nin: ["approved", "completed"] },
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
          todayStr,
        ],
      },
    });

    const installmentsDueInWeek = await Payment.countDocuments({
      paymentType: "cicilan-installment",
      status: { $nin: ["approved", "completed"] },
      $expr: {
        $eq: [
          { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
          weekFromTodayStr,
        ],
      },
    });

    return NextResponse.json({
      message: "Cicilan reminder status",
      today: todayStr,
      weekFromToday: weekFromTodayStr,
      installmentsDueToday,
      installmentsDueInWeek,
      totalPendingReminders: installmentsDueToday + installmentsDueInWeek,
    });
  } catch (error) {
    console.error("Failed to check cicilan reminder status:", error);
    return NextResponse.json(
      { error: "Failed to check status", details: (error as any).message },
      { status: 500 }
    );
  }
}

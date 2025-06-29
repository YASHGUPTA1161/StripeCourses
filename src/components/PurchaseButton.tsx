"use client";

import { useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PurchaseButton = ({ courseId }: { courseId: Id<"courses"> }) => {
	const { user } = useUser();
	const userData = useQuery(api.users.getUserByClerkId, user ? { clerkId: user?.id } : "skip");
	const [isLoading, setIsLoading] = useState(false);

	const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

	const userAccess = useQuery(
		api.users.getUserAccess,
		userData
			? {
					userId: userData?._id,
					courseId,
				}
			: "skip"
	) || { hasAccess: false };

	const handlePurchase = async () => {
		if (!user) return toast.error("Please log in to purchase", { id: "login-error" });

		setIsLoading(true);

		try {
			const { checkoutUrl } = await createCheckoutSession({ courseId });
			if (checkoutUrl) {
				window.location.href = checkoutUrl;
			} else {
				throw new Error("Failed to create checkout session");
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.message?.includes("Rate limit exceeded")) {
				toast.error("You've tried too many times. Please try again later.");
			} else {
				toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again later.");
			}
			console.log(error);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading) {
		return (
			<Button disabled>
				<Loader2Icon className='mr-2 size-4 animate-spin' />
				Processing...
			</Button>
		);
	}

	// If user has subscription access, show "Pro Access" instead of "Enrolled"
	if (userAccess.hasAccess && userAccess.accessType === "subscription") {
		return <Button variant={"outline"}>Pro Access</Button>;
	}

	// If user has individual course access, show "Enrolled"
	if (userAccess.hasAccess && userAccess.accessType === "course") {
		return <Button variant={"outline"}>Enrolled</Button>;
	}

	return (
		<Button variant={"outline"} onClick={handlePurchase}>
			Enroll Now
		</Button>
	);
};

export default PurchaseButton;

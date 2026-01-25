/**
 * Page for accepting a list invite.
 *
 * Route: /join/:listId/:token
 *
 * This page is accessible to both authenticated and unauthenticated users.
 * Unauthenticated users are prompted to log in first.
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Login } from "./Login";

export function JoinList() {
  const { listId, token } = useParams<{ listId: string; token: string }>();
  const navigate = useNavigate();
  const { did, isAuthenticated, isLoading: isUserLoading } = useCurrentUser();

  const acceptInvite = useMutation(api.invites.acceptInvite);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a state to capture the timestamp on first render only
  const [validationTime] = useState(() => Date.now());

  // Validate the invite
  const validation = useQuery(
    api.invites.validateInvite,
    listId && token
      ? {
          listId: listId as Id<"lists">,
          token,
          currentTime: validationTime,
        }
      : "skip"
  );

  // Show login if not authenticated (but don't unmount during loading to preserve OTP state)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Login embedded />
        <div className="text-center text-gray-500 -mt-4 pb-8">
          Sign in to join this list.
        </div>
      </div>
    );
  }

  // Loading states (only shown after authenticated)
  if (isUserLoading || validation === undefined) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">Validating invite...</div>
      </div>
    );
  }

  // Invalid invite
  if (!validation.valid) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white rounded-lg shadow p-6">
        <div className="text-red-500 text-5xl mb-4">:(</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h2>
        <p className="text-gray-500 mb-4">{validation.error}</p>
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          Go to your lists
        </Link>
      </div>
    );
  }

  // Valid invite - show join option
  const handleJoin = async () => {
    if (!did || !listId || !token) return;

    setIsJoining(true);
    setError(null);

    try {
      await acceptInvite({
        listId: listId as Id<"lists">,
        token,
        userDid: did,
        currentTime: Date.now(),
      });

      // Navigate to the list
      navigate(`/list/${listId}`);
    } catch (err) {
      console.error("Failed to join list:", err);
      setError("Failed to join list. Please try again.");
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center py-12 bg-white rounded-lg shadow p-6">
      <div className="text-5xl mb-4">+</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        You're invited to join "{validation.listName}"
      </h2>
      <p className="text-gray-500 mb-6">
        Accept this invite to start collaborating on the list.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 justify-center">
        <Link
          to="/"
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md font-medium hover:bg-gray-200"
        >
          Cancel
        </Link>
        <button
          onClick={handleJoin}
          disabled={isJoining}
          className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isJoining ? "Joining..." : "Join List"}
        </button>
      </div>
    </div>
  );
}

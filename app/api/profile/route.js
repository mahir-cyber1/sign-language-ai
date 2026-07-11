import { createClient } from "@supabase/supabase-js";
import {
  profileAvatars,
  profileFrames,
  profileThemes,
} from "../../../lib/profileAvatars";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getDisplayNameKey(displayName) {
  return String(displayName || "").trim().toLowerCase();
}

function isMissingDisplayNameKeyError(error) {
  const message = String(error?.message || "");

  return (
    message.includes("display_name_key") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("Could not find"))
  );
}

function isMissingAvatarIdError(error) {
  const message = String(error?.message || "");

  return (
    message.includes("avatar_id") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("Could not find"))
  );
}

function isMissingGradeLevelError(error) {
  const message = String(error?.message || "");

  return (
    message.includes("grade_level") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("Could not find"))
  );
}

function isMissingFrameIdError(error) {
  return String(error?.message || "").includes("frame_id");
}

function isMissingThemeIdError(error) {
  return String(error?.message || "").includes("theme_id");
}

async function findNameMatch(client, table, displayNameKey, currentUser) {
  const { data, error } = await client
    .from(table)
    .select(table === "user_profiles" ? "user_id,email" : "email")
    .eq("display_name_key", displayNameKey)
    .maybeSingle();

  if (isMissingDisplayNameKeyError(error)) {
    return null;
  }

  if (error) {
    throw error;
  }

  if (!data) return null;

  if (table === "user_profiles") {
    return data.user_id === currentUser.id ? null : data;
  }

  return data.email === currentUser.email ? null : data;
}

async function upsertProfile(client, payload) {
  const fallbackPayload = { ...payload };
  let storesAvatarInProfile = true;
  let storesGradeInProfile = true;
  let storesFrameInProfile = true;
  let storesThemeInProfile = true;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const fields = [
      "display_name",
      storesAvatarInProfile ? "avatar_id" : null,
      storesGradeInProfile ? "grade_level" : null,
      storesFrameInProfile ? "frame_id" : null,
      storesThemeInProfile ? "theme_id" : null,
    ]
      .filter(Boolean)
      .join(",");
    const { data, error } = await client
      .from("user_profiles")
      .upsert(fallbackPayload, { onConflict: "user_id" })
      .select(fields)
      .single();

    if (!error) {
      return {
        data,
        error: null,
        storesAvatarInProfile,
        storesGradeInProfile,
        storesFrameInProfile,
        storesThemeInProfile,
      };
    }

    if (
      isMissingDisplayNameKeyError(error) &&
      "display_name_key" in fallbackPayload
    ) {
      delete fallbackPayload.display_name_key;
      continue;
    }

    if (isMissingAvatarIdError(error) && "avatar_id" in fallbackPayload) {
      delete fallbackPayload.avatar_id;
      storesAvatarInProfile = false;
      continue;
    }

    if (isMissingGradeLevelError(error) && "grade_level" in fallbackPayload) {
      delete fallbackPayload.grade_level;
      storesGradeInProfile = false;
      continue;
    }

    if (isMissingFrameIdError(error) && "frame_id" in fallbackPayload) {
      delete fallbackPayload.frame_id;
      storesFrameInProfile = false;
      continue;
    }

    if (isMissingThemeIdError(error) && "theme_id" in fallbackPayload) {
      delete fallbackPayload.theme_id;
      storesThemeInProfile = false;
      continue;
    }

    return {
      data: null,
      error,
      storesAvatarInProfile,
      storesGradeInProfile,
      storesFrameInProfile,
      storesThemeInProfile,
    };
  }

  return {
    data: null,
    error: new Error("Das Profil konnte nicht gespeichert werden."),
    storesAvatarInProfile,
    storesGradeInProfile,
    storesFrameInProfile,
    storesThemeInProfile,
  };
}

async function updateStoredDisplayName(client, table, email, displayName, displayNameKey) {
  const payload = {
    display_name: displayName,
    display_name_key: displayNameKey,
  };

  const { error } = await client.from(table).update(payload).eq("email", email);

  if (!isMissingDisplayNameKeyError(error)) {
    return;
  }

  delete payload.display_name_key;
  await client.from(table).update(payload).eq("email", email);
}

async function getUser(req, adminClient) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return { error: "Nicht eingeloggt.", status: 401 };
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return { error: "Session ist ungueltig.", status: 401 };
  }

  return { user };
}

export async function POST(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json(
      { error: "Admin-Client ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const auth = await getUser(req, adminClient);

  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { displayName, avatarId, gradeLevel, frameId, themeId } =
    await req.json();
  const trimmedName = String(displayName || "").trim().slice(0, 60);
  const displayNameKey = getDisplayNameKey(trimmedName);
  const selectedGradeLevel = ["4", "5", "6"].includes(String(gradeLevel))
    ? String(gradeLevel)
    : "4";
  const { data: pointData } = await adminClient
    .from("user_points")
    .select("points")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const points = pointData?.points || 0;
  const selectedAvatar =
    profileAvatars.find((avatar) => avatar.id === avatarId) ||
    profileAvatars[0];
  const selectedFrame =
    profileFrames.find((frame) => frame.id === frameId) || profileFrames[0];
  const selectedTheme =
    profileThemes.find((theme) => theme.id === themeId) || profileThemes[0];
  const selectedAvatarId =
    points >= selectedAvatar.unlockPoints ? selectedAvatar.id : "star";
  const selectedFrameId =
    points >= selectedFrame.unlockPoints ? selectedFrame.id : "none";
  const selectedThemeId =
    points >= selectedTheme.unlockPoints ? selectedTheme.id : "blue";

  if (trimmedName.length < 2) {
    return Response.json(
      { error: "Bitte mindestens 2 Zeichen fuer den Namen eingeben." },
      { status: 400 }
    );
  }

  let profileMatch = null;
  let approvedMatch = null;
  let requestMatch = null;

  try {
    [profileMatch, approvedMatch, requestMatch] = await Promise.all([
      findNameMatch(adminClient, "user_profiles", displayNameKey, auth.user),
      findNameMatch(
        adminClient,
        "approved_login_emails",
        displayNameKey,
        auth.user
      ),
      findNameMatch(
        adminClient,
        "login_access_requests",
        displayNameKey,
        auth.user
      ),
    ]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (profileMatch || approvedMatch || requestMatch) {
    return Response.json(
      {
        error:
          "Dieser Name existiert bereits. Bitte waehle einen anderen Namen.",
      },
      { status: 409 }
    );
  }

  const {
    data: savedProfile,
    error,
    storesAvatarInProfile,
    storesGradeInProfile,
    storesFrameInProfile,
    storesThemeInProfile,
  } = await upsertProfile(adminClient, {
    user_id: auth.user.id,
    email: auth.user.email,
    display_name: trimmedName,
    display_name_key: displayNameKey,
    avatar_id: selectedAvatarId,
    grade_level: selectedGradeLevel,
    frame_id: selectedFrameId,
    theme_id: selectedThemeId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    let message = error.message;

    if (error.message?.includes("duplicate")) {
      message = "Dieser Name existiert bereits. Bitte waehle einen anderen Namen.";
    }

    return Response.json({ error: message }, { status: 500 });
  }

  if (
    savedProfile?.display_name !== trimmedName ||
    (storesAvatarInProfile && savedProfile?.avatar_id !== selectedAvatarId) ||
    (storesGradeInProfile &&
      String(savedProfile?.grade_level) !== selectedGradeLevel)
  ) {
    return Response.json(
      { error: "Das Profil konnte nicht vollstaendig gespeichert werden." },
      { status: 500 }
    );
  }

  const { error: metadataError } =
    await adminClient.auth.admin.updateUserById(auth.user.id, {
    user_metadata: {
      ...auth.user.user_metadata,
      display_name: trimmedName,
      avatar_id: selectedAvatarId,
      grade_level: selectedGradeLevel,
      frame_id: selectedFrameId,
      theme_id: selectedThemeId,
    },
  });

  if (
    metadataError &&
    (!storesAvatarInProfile ||
      !storesGradeInProfile ||
      !storesFrameInProfile ||
      !storesThemeInProfile)
  ) {
    return Response.json(
      { error: "Das Profilbild konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  await Promise.all([
    updateStoredDisplayName(
      adminClient,
      "approved_login_emails",
      auth.user.email,
      trimmedName,
      displayNameKey
    ),
    updateStoredDisplayName(
      adminClient,
      "login_access_requests",
      auth.user.email,
      trimmedName,
      displayNameKey
    ),
  ]);

  return Response.json({
    displayName: savedProfile.display_name,
    avatarId: selectedAvatarId,
    gradeLevel: selectedGradeLevel,
    frameId: selectedFrameId,
    themeId: selectedThemeId,
  });
}

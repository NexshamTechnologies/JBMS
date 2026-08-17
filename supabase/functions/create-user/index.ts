import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Client using the caller's JWT
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseUser.auth.getUser();

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication session.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Admin client — ONLY inside the Edge Function
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );
    .insert({
  id: authUser.id,
  name,
  email: authUser.email,
  role,
  is_active: true,
})

    // Check caller's profile
    const { data: callerProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

    if (
      profileError ||
      !callerProfile ||
      callerProfile.role !== "Owner"
    ) {
      return new Response(
        JSON.stringify({
          error: "Only the Owner can create users.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = body.role;

    if (!name || !email || !password || !role) {
      return new Response(
        JSON.stringify({
          error: "Name, email, password and role are required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          error: "Password must be at least 6 characters.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!["Owner", "Rahul", "Accountant"].includes(role)) {
      return new Response(
        JSON.stringify({
          error: "Invalid user role.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create actual Supabase Auth account
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({
          error:
            authError?.message ||
            "Failed to create authentication user.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authUser = authData.user;

    // Create profile
const {
  data: profile,
  error: insertProfileError,
} = await supabaseAdmin
  .from("profiles")
  .insert({
    id: authUser.id,
    name,
    email: authUser.email,
    role,
    is_active: true,
  })
  .select()
  .single();

    if (insertProfileError) {
      // Roll back Auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(
        authUser.id
      );

      return new Response(
        JSON.stringify({
          error:
            `Failed to create user profile: ` +
            insertProfileError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

return new Response(
  JSON.stringify({
    success: true,
    user: {
      id: authUser.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      isActive: profile.is_active,
    },
  }),
  {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  }
);
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
/// Centralized list of REST endpoints. Keeping them in one place makes it
/// trivial to point the app at a staging or production environment.
class Endpoints {
  const Endpoints();

  // ─── AI models ────────────────────────────────────────────────────────────
  String get aiModels => '/v1/models';

  // ─── Conversations ────────────────────────────────────────────────────────
  String get conversations => '/v1/conversations';
  String conversationById(String id) => '/v1/conversations/$id';

  // ─── Messages ─────────────────────────────────────────────────────────────
  String messages(String conversationId) =>
      '/v1/conversations/$conversationId/messages';

  // ─── Subscription ─────────────────────────────────────────────────────────
  String get subscription => '/v1/subscription';
}

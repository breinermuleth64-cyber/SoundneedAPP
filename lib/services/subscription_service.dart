import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:purchases_ui_flutter/purchases_ui_flutter.dart';

class SubscriptionService extends ChangeNotifier {
  SubscriptionService._();

  static final instance = SubscriptionService._();

  static const entitlementId = String.fromEnvironment(
    'SOUNDNEED_REVENUECAT_ENTITLEMENT',
    defaultValue: 'soundneed_crystal',
  );
  static const androidApiKey = String.fromEnvironment(
    'SOUNDNEED_REVENUECAT_ANDROID_KEY',
  );
  static const iosApiKey = String.fromEnvironment(
    'SOUNDNEED_REVENUECAT_IOS_KEY',
  );

  bool _initialized = false;
  bool _loading = false;
  bool _isPremium = false;
  String? _error;
  Offerings? _offerings;

  bool get isInitialized => _initialized;
  bool get isLoading => _loading;
  bool get isPremium => _isPremium;
  String? get error => _error;

  Offering? get _activeOffering {
    final offerings = _offerings;
    if (offerings == null) return null;
    return offerings.current ??
        offerings.all['colombia'] ??
        offerings.all['default'] ??
        (offerings.all.isEmpty ? null : offerings.all.values.first);
  }

  List<Package> get availablePackages =>
      _activeOffering?.availablePackages ?? const <Package>[];
  Package? get monthlyPackage =>
      _activeOffering?.monthly ??
      _findPackage(PackageType.monthly, const ['month', 'mensual']);
  Package? get threeMonthPackage =>
      _activeOffering?.threeMonth ??
      _findPackage(PackageType.threeMonth, const [
        '3month',
        'three_month',
        'quarter',
        'trimestre',
      ]);
  Package? get annualPackage =>
      _activeOffering?.annual ??
      _findPackage(PackageType.annual, const [
        'annual',
        'anual',
        'yearly',
        'year',
        '12month',
      ]);

  Package? _findPackage(PackageType type, List<String> identifierTerms) {
    for (final package in availablePackages) {
      if (package.packageType == type) return package;
    }
    for (final package in availablePackages) {
      final identifier = package.identifier.toLowerCase();
      if (identifierTerms.any(identifier.contains)) return package;
    }
    return null;
  }

  String displayPriceFor(Package package) {
    switch (package.packageType) {
      case PackageType.monthly:
        return r'$6.900';
      case PackageType.threeMonth:
        return r'$18.000 COP';
      case PackageType.annual:
        return r'$80.000 COP';
      default:
        return package.storeProduct.priceString;
    }
  }

  bool get isSupported {
    if (kIsWeb) return false;
    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;
  }

  Future<void> initialize() async {
    if (_initialized || !isSupported) return;
    final apiKey = defaultTargetPlatform == TargetPlatform.android
        ? androidApiKey
        : iosApiKey;
    if (apiKey.isEmpty) {
      _error = 'Falta configurar la clave publica de RevenueCat.';
      notifyListeners();
      return;
    }
    try {
      await Purchases.configure(PurchasesConfiguration(apiKey));
      Purchases.addCustomerInfoUpdateListener(_onCustomerInfoUpdated);
      _initialized = true;
      await refresh();
    } catch (error) {
      _error = 'No se pudo iniciar el sistema de suscripciones.';
      debugPrint('[SubscriptionService] $error');
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    if (!_initialized) return;
    try {
      final customerInfo = await Purchases.getCustomerInfo();
      _onCustomerInfoUpdated(customerInfo);
      _offerings = await Purchases.getOfferings();
      _error = null;
    } catch (error) {
      _error = 'No se pudieron cargar las opciones Premium.';
      debugPrint('[SubscriptionService] $error');
    } finally {
      notifyListeners();
    }
  }

  Future<bool> purchaseMonthly() async {
    final package = monthlyPackage;
    if (package != null) return purchase(package);
    if (availablePackages.length == 1) return purchase(availablePackages.first);
    _error = 'No hay un plan mensual configurado.';
    notifyListeners();
    return false;
  }

  Future<bool> presentPaywall() async {
    if (!_initialized || !isSupported) {
      _error = 'La pantalla de suscripción todavía no está disponible.';
      notifyListeners();
      return false;
    }
    try {
      await RevenueCatUI.presentPaywallIfNeeded(entitlementId);
      await refresh();
      return _isPremium;
    } on PlatformException catch (error) {
      _error = 'No se pudo mostrar la pantalla de suscripción.';
      debugPrint('[SubscriptionService] Paywall error: $error');
      notifyListeners();
      return false;
    } catch (error) {
      _error = 'No se pudo mostrar la pantalla de suscripción.';
      debugPrint('[SubscriptionService] Paywall error: $error');
      notifyListeners();
      return false;
    }

  }

  Future<bool> purchase(Package package) async {
    if (!_initialized) {
      _error = 'La suscripcion todavia no esta disponible.';
      notifyListeners();
      return false;
    }
    _setLoading(true);
    try {
      final result = await Purchases.purchasePackage(package);
      _onCustomerInfoUpdated(result.customerInfo);
      return _isPremium;
    } on PlatformException catch (error) {
      if (PurchasesErrorHelper.getErrorCode(error) !=
          PurchasesErrorCode.purchaseCancelledError) {
        _error = 'No se pudo completar la compra.';
      }
      return false;
    } catch (error) {
      _error = 'No se pudo completar la compra.';
      debugPrint('[SubscriptionService] $error');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> restorePurchases() async {
    if (!_initialized) return false;
    _setLoading(true);
    try {
      final customerInfo = await Purchases.restorePurchases();
      _onCustomerInfoUpdated(customerInfo);
      return _isPremium;
    } catch (error) {
      _error = 'No se pudieron restaurar tus compras.';
      debugPrint('[SubscriptionService] $error');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _onCustomerInfoUpdated(CustomerInfo customerInfo) {
    _isPremium = customerInfo.entitlements.active.containsKey(entitlementId);
    notifyListeners();
  }

  void _setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }
}

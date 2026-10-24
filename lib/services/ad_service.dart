import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'subscription_service.dart';

class AdService {
  AdService._();

  static final instance = AdService._();
  static Future<InitializationStatus>? _initialization;

  static const _androidBannerId = String.fromEnvironment(
    'SOUNDNEED_ADMOB_ANDROID_BANNER_ID',
    defaultValue: 'ca-app-pub-7051472796475942/1214659020',
  );
  static const _iosBannerId = String.fromEnvironment(
    'SOUNDNEED_ADMOB_IOS_BANNER_ID',
    defaultValue: 'ca-app-pub-3940256099942544/2934735716',
  );

  static Future<void> initialize() async {
    if (kIsWeb) return;
    _initialization ??= MobileAds.instance.initialize();
    await _initialization;
  }

  static String get bannerAdUnitId {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return _iosBannerId;
    }
    return _androidBannerId;
  }
}

class SoundNeedBannerAd extends StatefulWidget {
  const SoundNeedBannerAd({super.key});

  @override
  State<SoundNeedBannerAd> createState() => _SoundNeedBannerAdState();
}

class _SoundNeedBannerAdState extends State<SoundNeedBannerAd> {
  final _subscriptionService = SubscriptionService.instance;
  BannerAd? _bannerAd;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _subscriptionService.addListener(_onSubscriptionChanged);
    _loadIfNeeded();
  }

  @override
  void dispose() {
    _subscriptionService.removeListener(_onSubscriptionChanged);
    _bannerAd?.dispose();
    super.dispose();
  }

  void _onSubscriptionChanged() {
    if (!mounted) return;
    if (_subscriptionService.isPremium) {
      _bannerAd?.dispose();
      setState(() => _bannerAd = null);
    } else {
      _loadIfNeeded();
    }
  }

  Future<void> _loadIfNeeded() async {
    if (kIsWeb || _subscriptionService.isPremium || _loading) return;
    _loading = true;
    await AdService.initialize();
    if (!mounted || _subscriptionService.isPremium) {
      _loading = false;
      return;
    }

    final ad = BannerAd(
      adUnitId: AdService.bannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (!mounted) {
            ad.dispose();
            return;
          }
          setState(() {
            _loading = false;
            _bannerAd = ad as BannerAd;
          });
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) setState(() => _loading = false);
        },
      ),
    );
    ad.load();
  }

  @override
  Widget build(BuildContext context) {
    final ad = _bannerAd;
    if (kIsWeb || _subscriptionService.isPremium || ad == null) {
      return const SizedBox.shrink();
    }
    return SafeArea(
      top: false,
      child: SizedBox(
        width: ad.size.width.toDouble(),
        height: ad.size.height.toDouble(),
        child: AdWidget(ad: ad),
      ),
    );
  }
}
